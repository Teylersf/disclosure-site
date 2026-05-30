"""
Manifest rebuild — runs daily after the capture jobs finish.

LIST every key under satellite/ on Linode, infer (kind, date, aoi_id, source)
from each path, and write the aggregated manifest to:

   s3://disclosure/satellite/satellite.json     (public-read, max-age=60)

The Next.js site fetches that URL at request time (with ISR revalidate)
instead of importing a bundled JSON, so this job's output is immediately
visible without any GitHub commit or Vercel rebuild.

Deploy:
    modal deploy jobs/manifest_rebuild.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import json
import os
from collections import defaultdict
from datetime import datetime, timezone

import modal

from lib.aois import INCIDENT_AOIS
from lib.storage import Storage


app = modal.App("pursue-manifest-rebuild")
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "boto3>=1.34",
)
SECRETS = [modal.Secret.from_name("pursue-secrets")]


def asset_url(key: str) -> str:
    base = os.environ.get("NEXT_PUBLIC_ASSET_BASE_URL", "https://disclosure.us-east-1.linodeobjects.com")
    return f"{base.rstrip('/')}/{key.lstrip('/')}"


def label_for_file(filename: str) -> tuple[str, int | None]:
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
    if "sentinel2-rendered" in f:        return ("Sentinel-2 rendered preview", 10)
    if "sentinel1-preview" in f:         return ("Sentinel-1 SAR preview", 10)
    if "landsat-preview" in f:           return ("Landsat 8/9 preview", 30)
    return (filename, None)


@app.function(image=image, secrets=SECRETS, schedule=modal.Cron("30 * * * *"), timeout=600)
def rebuild() -> dict:
    """Hourly rebuild — cheap enough that we don't need to wait for end of day."""
    storage = Storage.from_env()
    s3 = storage.client()

    # Walk the satellite/ prefix
    paginator = s3.get_paginator("list_objects_v2")
    objects: dict[str, int] = {}
    for page in paginator.paginate(Bucket=storage.bucket, Prefix="satellite/"):
        for obj in page.get("Contents", []) or []:
            objects[obj["Key"]] = obj["Size"]

    iotd: list[dict] = []
    global_days: list[dict] = []
    incident_days: dict[tuple[str, str], list[dict]] = defaultdict(list)
    geostationary: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))

    def get_json(key: str) -> dict | None:
        if key not in objects:
            return None
        try:
            r = s3.get_object(Bucket=storage.bucket, Key=key)
            return json.loads(r["Body"].read())
        except Exception:
            return None

    for key, size in objects.items():
        if key.endswith("/satellite.json"):
            continue  # skip the manifest itself
        rel = key.removeprefix("satellite/")
        parts = rel.split("/")
        if parts[0] == "iotd" and len(parts) == 3:
            date = parts[1]
            file = parts[2]
            if file == "image.jpg":
                meta = get_json(f"satellite/iotd/{date}/meta.json") or {}
                iotd.append({
                    "date": date,
                    "title": meta.get("title", ""),
                    "link": meta.get("link", ""),
                    "description": meta.get("description", ""),
                    "image_url": asset_url(key),
                    "size_bytes": size,
                })
        elif parts[0] == "gibs-global" and len(parts) == 3 and parts[2].endswith(".jpg"):
            global_days.append({"date": parts[1], "url": asset_url(key), "size_bytes": size})
        elif parts[0] == "incidents" and len(parts) == 4 and not parts[3].startswith("meta"):
            aoi_id, date, fname = parts[1], parts[2], parts[3]
            source, res = label_for_file(fname)
            cap = {"source": source, "file": fname, "url": asset_url(key), "size_bytes": size, "resolution_m": res}
            if fname.startswith("sentinel2-") or fname.startswith("sentinel1-") or fname.startswith("landsat-"):
                kind = "sentinel2" if fname.startswith("sentinel2-") else ("sentinel1" if fname.startswith("sentinel1-") else "landsat")
                m = get_json(f"satellite/incidents/{aoi_id}/{date}/meta-{kind}.json") or {}
                if m.get("datetime_utc"): cap["datetime_utc"] = m["datetime_utc"]
                if m.get("cloud_cover_percent") is not None: cap["cloud_cover_percent"] = m["cloud_cover_percent"]
                if m.get("platform"): cap["platform"] = m["platform"]
            incident_days[(aoi_id, date)].append(cap)
        elif parts[0] == "geostationary" and len(parts) == 4 and parts[3].endswith(".jpg"):
            sat, date, fname = parts[1], parts[2], parts[3]
            hhmm = fname.removesuffix(".jpg")
            geostationary[sat][date].append({"hhmm": hhmm, "url": asset_url(key), "size_bytes": size})

    iotd.sort(key=lambda x: x["date"], reverse=True)
    global_days.sort(key=lambda x: x["date"], reverse=True)
    bundles = []
    for (aoi_id, date), captures in incident_days.items():
        bundles.append({"aoi_id": aoi_id, "date": date, "captures": captures})
    bundles.sort(key=lambda x: (x["aoi_id"], x["date"]), reverse=True)

    geo_summary = {}
    for sat, by_date in geostationary.items():
        day_keys = sorted(by_date.keys(), reverse=True)
        geo_summary[sat] = {
            "total_days": len(day_keys),
            "total_frames": sum(len(by_date[d]) for d in day_keys),
            "recent_days": [
                {"date": d, "frames": sorted(by_date[d], key=lambda f: f["hhmm"])}
                for d in day_keys[:14]
            ],
        }

    aois = [{
        "id": a.id, "name": a.name, "lat": a.lat, "lng": a.lng,
        "bbox": list(a.bbox), "context": a.context,
    } for a in INCIDENT_AOIS]

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "aois": aois,
        "iotd": iotd,
        "global": global_days,
        "incidentDays": bundles,
        "geostationary": geo_summary,
    }
    body = json.dumps(manifest, indent=2).encode("utf-8")

    # Push to Linode at satellite/satellite.json with a short cache.
    # The 60-second public cache means CDNs/browsers refresh within a minute
    # of a manifest update, but we don't hammer the bucket with no-cache.
    s3.put_object(
        Bucket=storage.bucket,
        Key="satellite/satellite.json",
        Body=body,
        ContentType="application/json",
        ACL="public-read",
        CacheControl="public, max-age=60",
    )

    return {
        "ok": True,
        "manifest_url": f"{os.environ.get('NEXT_PUBLIC_ASSET_BASE_URL', 'https://disclosure.us-east-1.linodeobjects.com')}/satellite/satellite.json",
        "objects_seen": len(objects),
        "manifest_bytes": len(body),
        "iotd": len(iotd),
        "global_days": len(global_days),
        "aoi_day_bundles": len(bundles),
        "geostationary": {sat: g["total_frames"] for sat, g in geo_summary.items()},
    }


@app.local_entrypoint()
def main():
    print(rebuild.remote())
