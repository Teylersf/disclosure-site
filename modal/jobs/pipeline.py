"""
Consolidated pursue.report pipeline — fits in 2 cron slots so it runs on
Modal's free tier.

Two scheduled entrypoints:

  tick_30min        every 30 min UTC
    - always: snapshot geostationary frames (GOES-East/West, Himawari, Meteosat)
    - hour 05 :00: also run polar daily sweep (VIIRS, MODIS × 12 AOIs + global)
    - hour 07 :00: also run Sentinel-2 hi-res sweep
    - hour 08 :00: also run Sentinel-1 SAR sweep
    - hour 09 :00: also run Landsat sweep
    - hour 14 :00: also fetch NASA EO Image of the Day

  rebuild_manifest  every hour at :30
    - LIST satellite/ on Linode, regen satellite.json, write to bucket

Together those replace the 9 individual jobs. Storage layout on Linode is
identical to the per-source layout the site expects.

Deploy:
    modal deploy jobs/pipeline.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import json
import os
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import modal
import requests

from lib.aois import INCIDENT_AOIS
from lib.gibs import wms_url, is_blank
from lib.stac import search_recent
from lib.storage import Storage


app = modal.App("pursue-pipeline")

# Mount the sibling lib/ directory inside the container at /root/lib so the
# `from lib.X import Y` imports resolve at import time. Without this Modal
# only ships pipeline.py and the imports crash-loop with ModuleNotFoundError.
LIB_DIR = str(Path(__file__).parent.parent / "lib")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("boto3>=1.34", "requests>=2.31")
    .add_local_dir(LIB_DIR, remote_path="/root/lib")
)
SECRETS = [modal.Secret.from_name("pursue-secrets")]


# ====================================================================
# helpers
# ====================================================================
UA = "Mozilla/5.0 (compatible; pursue.report/1.0; +https://pursue.report)"

def _ymd(d: datetime) -> str: return d.strftime("%Y-%m-%d")

def _http_get(url: str, timeout: int = 60, headers: dict | None = None) -> bytes | None:
    try:
        r = requests.get(url, timeout=timeout, headers=headers or {"User-Agent": UA})
        if not r.ok or len(r.content) < 1000:
            return None
        return r.content
    except Exception:
        return None


# ====================================================================
# 1) Geostationary — runs every 30 min
# ====================================================================
GEO_SATS = [
    # GIBS exposes these GeoColor composites as PNG. GOES-East covers the
    # Americas, GOES-West covers the Pacific Basin.
    ("goes-east", "GOES-East_ABI_GeoColor",                 (-135.0, -65.0, -15.0, 65.0)),
    ("goes-west", "GOES-West_ABI_GeoColor",                 (-180.0, -65.0, -90.0, 65.0)),
    # Himawari true color isn't in GIBS — but Band 3 (red visible) gives a
    # daytime grayscale image at 1 km, and Band 13 (clean IR) works 24/7 for
    # cloud-top thermal. Together they cover the full Asia/Pacific basin.
    ("himawari-vis", "Himawari_AHI_Band3_Red_Visible_1km",  (80.0,   -60.0, 200.0, 60.0)),
    ("himawari-ir",  "Himawari_AHI_Band13_Clean_Infrared",  (80.0,   -60.0, 200.0, 60.0)),
    # Meteosat: not in GIBS at all. To capture Europe/Africa we'd need
    # EUMETSAT Data Store (requires free registration + token). Deferred.
]


def _round_to_10min_back(now: datetime, back_min: int = 15) -> datetime:
    """Subtract `back_min` minutes (lag for GIBS ingestion), then snap down
    to a 10-minute boundary. GIBS only publishes frames at HH:00, HH:10, ...
    so we MUST land on a multiple of 10, otherwise the WMS returns a tiny
    'no data' placeholder JPEG."""
    earlier = now - timedelta(minutes=back_min)
    minute = (earlier.minute // 10) * 10
    return earlier.replace(minute=minute, second=0, microsecond=0)


def _try_frame(layer: str, bbox, frame_at: datetime) -> tuple[bytes | None, str]:
    """Try to fetch one 2048×2048 full-disc frame. Returns (body|None, time_iso)."""
    time_iso = frame_at.strftime("%Y-%m-%dT%H:%M:%SZ")
    url = wms_url(layer, bbox, time_iso, width=2048, height=2048)
    body = _http_get(url, timeout=90)
    if body is None or len(body) < 50_000:
        return None, time_iso
    return body, time_iso


def do_geostationary(now: datetime, storage: Storage) -> dict:
    """For each satellite, find the most-recent published frame by walking
    backward in 5-min steps. GIBS publishing is irregular — sometimes only
    HH:10 / HH:50 frames have real data, sometimes every 10 min. The walk
    tries up to 12 timestamps (~60 min back) before giving up."""
    out = []
    total = 0
    for sat_id, layer, bbox in GEO_SATS:
        body = None
        time_iso = ""
        frame_at = None
        # Start 10 min back (account for ingestion lag) then walk back in 5-min steps
        base = now - timedelta(minutes=10)
        # Snap to a 5-min boundary
        base = base.replace(minute=(base.minute // 5) * 5, second=0, microsecond=0)
        for i in range(12):
            attempt = base - timedelta(minutes=5 * i)
            body, time_iso = _try_frame(layer, bbox, attempt)
            if body is not None:
                frame_at = attempt
                break
        if body is None or frame_at is None:
            out.append({"sat": sat_id, "ok": False, "frame_at": time_iso, "tried": 12})
            continue
        date_str = _ymd(frame_at)
        hhmm = frame_at.strftime("%H%M")
        key = f"geostationary/{sat_id}/{date_str}/{hhmm}.jpg"
        r = storage.put(key, body, content_type="image/jpeg")
        total += r["size"]
        out.append({"sat": sat_id, "ok": True, "key": r["key"], "skipped": r["skipped"], "size": r["size"], "frame_at": time_iso})
    return {"results": out, "bytes": total}


# ====================================================================
# 2) Polar daily — all VIIRS/MODIS layers × every AOI + global VIIRS mosaic
# ====================================================================
AOI_LAYERS = [
    ("viirs-noaa20-truecolor",   "VIIRS_NOAA20_CorrectedReflectance_TrueColor"),
    ("viirs-snpp-truecolor",     "VIIRS_SNPP_CorrectedReflectance_TrueColor"),
    ("modis-terra-truecolor",    "MODIS_Terra_CorrectedReflectance_TrueColor"),
    ("modis-aqua-truecolor",     "MODIS_Aqua_CorrectedReflectance_TrueColor"),
    ("viirs-noaa20-night",       "VIIRS_NOAA20_DayNightBand_ENCC"),
    ("viirs-noaa20-fires",       "VIIRS_NOAA20_Thermal_Anomalies_375m_Day"),
    ("modis-terra-thermal",      "MODIS_Terra_Thermal_Anomalies_All"),
    ("modis-aqua-cloudtop-temp", "MODIS_Aqua_Cloud_Top_Temp_Day"),
]


def do_polar(date: str, storage: Storage) -> dict:
    added = skipped = no_data = bytes_total = 0
    for aoi in INCIDENT_AOIS:
        for layer_id, layer in AOI_LAYERS:
            key = f"incidents/{aoi.id}/{date}/{layer_id}.jpg"
            if storage.remote_size(f"satellite/{key}") is not None:
                skipped += 1
                continue
            url = wms_url(layer, aoi.bbox, date, width=1024, height=1024)
            body = _http_get(url, timeout=60)
            if body is None or is_blank(body):
                no_data += 1
                continue
            r = storage.put(key, body, content_type="image/jpeg")
            added += 1
            bytes_total += r["size"]

    key_global = f"gibs-global/{date}/viirs-noaa20-truecolor.jpg"
    if storage.remote_size(f"satellite/{key_global}") is None:
        url = wms_url("VIIRS_NOAA20_CorrectedReflectance_TrueColor",
                      (-180.0, -90.0, 180.0, 90.0), date, width=2048, height=1024)
        body = _http_get(url, timeout=120)
        if body:
            r = storage.put(key_global, body, content_type="image/jpeg")
            added += 1
            bytes_total += r["size"]
    else:
        skipped += 1
    return {"date": date, "added": added, "skipped": skipped, "no_data": no_data, "bytes": bytes_total}


# ====================================================================
# 3) Sentinel-2 / Sentinel-1 / Landsat — per-AOI hi-res via STAC
# ====================================================================
def _do_stac_aoi(collection: str, max_cloud: float | None, kind: str,
                 preview_field: str, file_basename: str,
                 storage: Storage, days_back: int = 30) -> dict:
    added = 0
    summary = []
    for aoi in INCIDENT_AOIS:
        try:
            features = search_recent(collection, aoi.bbox, days_back=days_back, max_cloud=max_cloud, limit=1)
        except Exception as e:
            summary.append({"aoi": aoi.id, "status": f"stac-error: {e}"})
            continue
        if not features:
            summary.append({"aoi": aoi.id, "status": "no-scenes"})
            continue
        top = features[0]
        date = top["properties"]["datetime"][:10]
        prefix = f"incidents/{aoi.id}/{date}"
        assets = top.get("assets", {})
        thumb = assets.get("thumbnail") or assets.get(preview_field)
        rendered = assets.get("rendered_preview")
        # primary preview
        if thumb and storage.remote_size(f"satellite/{prefix}/{file_basename}-preview.jpg") is None:
            body = _http_get(thumb["href"])
            if body:
                storage.put(f"{prefix}/{file_basename}-preview.jpg", body, content_type="image/jpeg")
                added += 1
        # rendered (better quality, when available)
        if rendered and storage.remote_size(f"satellite/{prefix}/{file_basename}-rendered.jpg") is None:
            body = _http_get(rendered["href"])
            if body:
                storage.put(f"{prefix}/{file_basename}-rendered.jpg", body, content_type="image/jpeg")
                added += 1
        # metadata
        meta = {
            "source": collection,
            "aoi_id": aoi.id,
            "aoi_name": aoi.name,
            "date": date,
            "datetime_utc": top["properties"]["datetime"],
            "stac_id": top["id"],
            "platform": top["properties"].get("platform"),
            "bbox": top["bbox"],
        }
        if "eo:cloud_cover" in top["properties"]:
            meta["cloud_cover_percent"] = top["properties"]["eo:cloud_cover"]
        storage.put(f"{prefix}/meta-{kind}.json",
                    json.dumps(meta, indent=2).encode("utf-8"),
                    content_type="application/json")
        summary.append({"aoi": aoi.id, "date": date})
    return {"collection": collection, "added": added, "summary": summary}


def do_sentinel2(storage: Storage) -> dict:
    return _do_stac_aoi("sentinel-2-l2a", 30.0, "sentinel2", "preview", "sentinel2", storage, 30)


def do_sentinel1(storage: Storage) -> dict:
    return _do_stac_aoi("sentinel-1-grd", None, "sentinel1", "preview", "sentinel1", storage, 14)


def do_landsat(storage: Storage) -> dict:
    return _do_stac_aoi("landsat-c2l2-sr", 30.0, "landsat", "rendered_preview", "landsat", storage, 30)


# ====================================================================
# 4) NASA EO Image of the Day
# ====================================================================
RSS_URL = "https://earthobservatory.nasa.gov/feeds/image-of-the-day.rss"


def _parse_iotd(xml: str) -> list[dict]:
    out = []
    for m in re.finditer(r"<item>([\s\S]*?)</item>", xml):
        body = m.group(1)
        def g(tag):
            mm = re.search(rf"<{tag}>([\s\S]*?)</{tag}>", body)
            if not mm: return ""
            v = mm.group(1).strip()
            v = re.sub(r"^<!\[CDATA\[", "", v); v = re.sub(r"\]\]>$", "", v)
            return v.strip()
        title, link, pub, desc = g("title"), g("link"), g("pubDate"), g("description")
        ce = re.search(r"<content:encoded>([\s\S]*?)</content:encoded>", body)
        content = ce.group(1).replace("<![CDATA[", "").replace("]]>", "") if ce else ""
        img = ""
        for im in re.finditer(r"<img[^>]+src=[\"']([^\"']+)[\"']", content):
            u = im.group(1)
            if u.endswith(".svg") or any(s in u for s in ("avatar", "gravatar", "sprite", "icon")):
                continue
            img = u; break
        if not img:
            im = re.search(r"<img[^>]+src=[\"']([^\"']+)[\"']", desc)
            if im: img = im.group(1)
        if not img: continue
        try:
            d = datetime.strptime(pub, "%a, %d %b %Y %H:%M:%S %z")
            out.append({"date": d.strftime("%Y-%m-%d"), "title": title, "link": link, "description": desc, "image_url": img, "pubDate": pub})
        except Exception:
            pass
    return out


def do_iotd(storage: Storage) -> dict:
    body = _http_get(RSS_URL, timeout=30)
    if not body:
        return {"ok": False, "reason": "rss-fetch-failed"}
    entries = _parse_iotd(body.decode("utf-8", errors="ignore"))
    added = skipped = 0
    for e in entries:
        img_key = f"iotd/{e['date']}/image.jpg"
        if storage.remote_size(f"satellite/{img_key}") is not None:
            skipped += 1
            continue
        img = _http_get(e["image_url"], timeout=60)
        if not img:
            continue
        storage.put(img_key, img, content_type="image/jpeg")
        meta = {
            "source": "nasa-eo-iotd",
            "date": e["date"], "title": e["title"], "link": e["link"],
            "description": re.sub(r"<[^>]+>", "", e["description"]).strip()[:4000],
            "pubDate": e["pubDate"],
            "image": {"file": "image.jpg", "source_url": e["image_url"], "size_bytes": len(img)},
        }
        storage.put(f"iotd/{e['date']}/meta.json", json.dumps(meta, indent=2).encode("utf-8"), content_type="application/json")
        added += 1
    return {"added": added, "skipped": skipped, "total_in_feed": len(entries)}


# ====================================================================
# 5) Manifest rebuild — runs hourly, writes satellite/satellite.json
# ====================================================================
def _asset_url(key: str) -> str:
    base = os.environ.get("NEXT_PUBLIC_ASSET_BASE_URL", "https://disclosure.us-east-1.linodeobjects.com")
    return f"{base.rstrip('/')}/{key.lstrip('/')}"


def _label_for_file(filename: str) -> tuple[str, int | None]:
    f = filename.lower()
    if "viirs-noaa20-truecolor" in f:    return ("VIIRS NOAA-20 True Color", 375)
    if "viirs-snpp-truecolor" in f:      return ("VIIRS Suomi NPP True Color", 375)
    if "modis-terra-truecolor" in f:     return ("MODIS Terra True Color", 250)
    if "modis-aqua-truecolor" in f:      return ("MODIS Aqua True Color", 250)
    if "viirs-noaa20-night" in f:        return ("VIIRS NOAA-20 Day/Night Band", 750)
    if "viirs-noaa20-fires" in f:        return ("VIIRS NOAA-20 Active Fires", 375)
    if "modis-terra-thermal" in f:       return ("MODIS Terra Thermal Anomalies", 1000)
    if "modis-aqua-cloudtop-temp" in f:  return ("MODIS Aqua Cloud-Top Temperature", 1000)
    if "sentinel2-preview" in f:         return ("Sentinel-2 preview", 10)
    if "sentinel2-rendered" in f:        return ("Sentinel-2 rendered", 10)
    if "sentinel1-preview" in f:         return ("Sentinel-1 SAR", 10)
    if "landsat-preview" in f:           return ("Landsat 8/9", 30)
    if "landsat-rendered" in f:          return ("Landsat 8/9 rendered", 30)
    return (filename, None)


def do_manifest_rebuild(storage: Storage) -> dict:
    s3 = storage.client()
    paginator = s3.get_paginator("list_objects_v2")
    objects: dict[str, int] = {}
    for page in paginator.paginate(Bucket=storage.bucket, Prefix="satellite/"):
        for obj in page.get("Contents", []) or []:
            objects[obj["Key"]] = obj["Size"]

    def get_json(key: str) -> dict | None:
        if key not in objects: return None
        try:
            r = s3.get_object(Bucket=storage.bucket, Key=key)
            return json.loads(r["Body"].read())
        except Exception:
            return None

    iotd, global_days = [], []
    incident_days = defaultdict(list)
    geostationary = defaultdict(lambda: defaultdict(list))

    for key, size in objects.items():
        if key.endswith("/satellite.json"): continue
        rel = key.removeprefix("satellite/")
        parts = rel.split("/")
        if parts[0] == "iotd" and len(parts) == 3 and parts[2] == "image.jpg":
            date = parts[1]
            meta = get_json(f"satellite/iotd/{date}/meta.json") or {}
            iotd.append({"date": date, "title": meta.get("title", ""), "link": meta.get("link", ""),
                         "description": meta.get("description", ""), "image_url": _asset_url(key), "size_bytes": size})
        elif parts[0] == "gibs-global" and len(parts) == 3 and parts[2].endswith(".jpg"):
            global_days.append({"date": parts[1], "url": _asset_url(key), "size_bytes": size})
        elif parts[0] == "incidents" and len(parts) == 4 and not parts[3].startswith("meta"):
            aoi_id, date, fname = parts[1], parts[2], parts[3]
            source, res = _label_for_file(fname)
            cap = {"source": source, "file": fname, "url": _asset_url(key), "size_bytes": size, "resolution_m": res}
            for kind in ("sentinel2", "sentinel1", "landsat"):
                if fname.startswith(f"{kind}-"):
                    m = get_json(f"satellite/incidents/{aoi_id}/{date}/meta-{kind}.json") or {}
                    if m.get("datetime_utc"): cap["datetime_utc"] = m["datetime_utc"]
                    if m.get("cloud_cover_percent") is not None: cap["cloud_cover_percent"] = m["cloud_cover_percent"]
                    if m.get("platform"): cap["platform"] = m["platform"]
                    break
            incident_days[(aoi_id, date)].append(cap)
        elif parts[0] == "geostationary" and len(parts) == 4 and parts[3].endswith(".jpg"):
            sat, date, fname = parts[1], parts[2], parts[3]
            geostationary[sat][date].append({"hhmm": fname.removesuffix(".jpg"), "url": _asset_url(key), "size_bytes": size})

    iotd.sort(key=lambda x: x["date"], reverse=True)
    global_days.sort(key=lambda x: x["date"], reverse=True)
    bundles = [{"aoi_id": k[0], "date": k[1], "captures": v} for k, v in incident_days.items()]
    bundles.sort(key=lambda x: (x["aoi_id"], x["date"]), reverse=True)
    geo_summary = {}
    for sat, by_date in geostationary.items():
        day_keys = sorted(by_date.keys(), reverse=True)
        geo_summary[sat] = {
            "total_days": len(day_keys),
            "total_frames": sum(len(by_date[d]) for d in day_keys),
            "recent_days": [{"date": d, "frames": sorted(by_date[d], key=lambda f: f["hhmm"])} for d in day_keys[:14]],
        }

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "aois": [{"id": a.id, "name": a.name, "lat": a.lat, "lng": a.lng, "bbox": list(a.bbox), "context": a.context} for a in INCIDENT_AOIS],
        "iotd": iotd, "global": global_days, "incidentDays": bundles, "geostationary": geo_summary,
    }
    body = json.dumps(manifest, indent=2).encode("utf-8")
    s3.put_object(Bucket=storage.bucket, Key="satellite/satellite.json", Body=body,
                  ContentType="application/json", ACL="public-read", CacheControl="public, max-age=60")
    return {"ok": True, "objects": len(objects), "bytes": len(body),
            "iotd": len(iotd), "global_days": len(global_days), "aoi_day_bundles": len(bundles),
            "geo": {sat: g["total_frames"] for sat, g in geo_summary.items()}}


# ====================================================================
# Scheduled entrypoints (these consume cron-slot quota)
# ====================================================================
@app.function(image=image, secrets=SECRETS, schedule=modal.Cron("*/30 * * * *"), timeout=1800)
def tick_30min() -> dict:
    storage = Storage.from_env()
    now = datetime.now(timezone.utc)
    out: dict = {"geo": do_geostationary(now, storage)}
    # Daily extras run at specific top-of-hour ticks
    if now.minute < 5:
        if now.hour == 5:
            out["polar"] = do_polar(_ymd(now - timedelta(days=1)), storage)
        elif now.hour == 7:
            out["sentinel2"] = do_sentinel2(storage)
        elif now.hour == 8:
            out["sentinel1"] = do_sentinel1(storage)
        elif now.hour == 9:
            out["landsat"] = do_landsat(storage)
        elif now.hour == 14:
            out["iotd"] = do_iotd(storage)
    return out


@app.function(image=image, secrets=SECRETS, schedule=modal.Cron("15 * * * *"), timeout=600)
def rebuild_manifest_hourly() -> dict:
    storage = Storage.from_env()
    return do_manifest_rebuild(storage)


# Manual entrypoints for testing without waiting for cron
@app.local_entrypoint()
def test_geo():
    print(tick_30min.remote())


@app.local_entrypoint()
def test_polar():
    storage = Storage.from_env()
    print(do_polar(_ymd(datetime.now(timezone.utc) - timedelta(days=1)), storage))


@app.local_entrypoint()
def test_manifest():
    print(rebuild_manifest_hourly.remote())
