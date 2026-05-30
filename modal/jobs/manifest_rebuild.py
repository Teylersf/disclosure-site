"""
Daily manifest rebuild + GitHub commit.

This is the keystone that closes the loop between Modal-captured imagery
on Linode and the Next.js site. Each run:

  1. LIST every key under satellite/ on Linode
  2. For each key, infer (kind, date, aoi_id, source) from the path
  3. Build the same satellite.json structure the Node manifest script does
  4. If the new manifest differs from what's in the repo, POST a commit to
     GitHub via the Contents API, which triggers a Vercel deploy

We use the GitHub Contents API directly (no git checkout needed) — only
one file changes per run (src/lib/satellite.json) so the API is enough.

Deploy:
    modal deploy jobs/manifest_rebuild.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import base64
import json
import os
import re
from collections import defaultdict
from datetime import datetime, timezone

import modal
import requests

from lib.aois import INCIDENT_AOIS
from lib.storage import Storage


app = modal.App("pursue-manifest-rebuild")
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "boto3>=1.34", "requests>=2.31",
)
SECRETS = [modal.Secret.from_name("pursue-secrets")]


GITHUB_API = "https://api.github.com"


def asset_url(key: str) -> str:
    base = os.environ.get("NEXT_PUBLIC_ASSET_BASE_URL", "https://disclosure.us-east-1.linodeobjects.com")
    return f"{base.rstrip('/')}/{key.lstrip('/')}"


def label_for_file(filename: str) -> tuple[str, int | None]:
    """Map a filename to (human source label, resolution_m)."""
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


@app.function(image=image, secrets=SECRETS, schedule=modal.Cron("30 22 * * *"), timeout=600)
def rebuild() -> dict:
    storage = Storage.from_env()
    s3 = storage.client()

    # Walk the satellite/ prefix once, keep a dict of key -> ContentLength
    paginator = s3.get_paginator("list_objects_v2")
    objects: dict[str, int] = {}
    for page in paginator.paginate(Bucket=storage.bucket, Prefix="satellite/"):
        for obj in page.get("Contents", []) or []:
            objects[obj["Key"]] = obj["Size"]

    iotd: list[dict] = []
    global_days: list[dict] = []
    incident_days: dict[tuple[str, str], list[dict]] = defaultdict(list)
    geostationary: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))

    # Pull all meta.json bodies once
    def get_json(key: str) -> dict | None:
        if key not in objects:
            return None
        try:
            r = s3.get_object(Bucket=storage.bucket, Key=key)
            return json.loads(r["Body"].read())
        except Exception:
            return None

    for key, size in objects.items():
        rel = key.removeprefix("satellite/")
        parts = rel.split("/")
        # iotd/<date>/image.jpg or meta.json
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
        # gibs-global/<date>/viirs-noaa20-truecolor.jpg
        elif parts[0] == "gibs-global" and len(parts) == 3 and parts[2].endswith(".jpg"):
            date = parts[1]
            global_days.append({"date": date, "url": asset_url(key), "size_bytes": size})
        # incidents/<aoi>/<date>/<file>
        elif parts[0] == "incidents" and len(parts) == 4 and not parts[3].startswith("meta"):
            aoi_id, date, fname = parts[1], parts[2], parts[3]
            source, res = label_for_file(fname)
            cap = {"source": source, "file": fname, "url": asset_url(key), "size_bytes": size, "resolution_m": res}
            # Sentinel metadata enrichment
            if fname.startswith("sentinel2-") or fname.startswith("sentinel1-") or fname.startswith("landsat-"):
                kind = "sentinel2" if fname.startswith("sentinel2-") else ("sentinel1" if fname.startswith("sentinel1-") else "landsat")
                m = get_json(f"satellite/incidents/{aoi_id}/{date}/meta-{kind}.json") or {}
                if m.get("datetime_utc"): cap["datetime_utc"] = m["datetime_utc"]
                if m.get("cloud_cover_percent") is not None: cap["cloud_cover_percent"] = m["cloud_cover_percent"]
                if m.get("platform"): cap["platform"] = m["platform"]
            incident_days[(aoi_id, date)].append(cap)
        # geostationary/<sat>/<date>/<hhmm>.jpg
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
        # Newest 7 days × ~48 frames is plenty for the manifest; keep older as
        # a compact day index. The actual frames remain on Linode forever.
        day_keys = sorted(by_date.keys(), reverse=True)
        geo_summary[sat] = {
            "total_days": len(day_keys),
            "total_frames": sum(len(by_date[d]) for d in day_keys),
            "recent_days": [
                {"date": d, "frames": sorted(by_date[d], key=lambda f: f["hhmm"])}
                for d in day_keys[:7]
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

    new_bytes = json.dumps(manifest, indent=2).encode("utf-8")

    # Push to GitHub via Contents API
    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPO", "Teylersf/disclosure-site")
    branch = os.environ.get("GITHUB_BRANCH", "main")
    if not token:
        return {"ok": False, "reason": "GITHUB_TOKEN not set", "would_write_bytes": len(new_bytes)}

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    path = "src/lib/satellite.json"
    # Fetch current SHA (and content for diffing)
    cur = requests.get(f"{GITHUB_API}/repos/{repo}/contents/{path}?ref={branch}", headers=headers, timeout=30)
    if cur.status_code == 200:
        cur_json = cur.json()
        cur_sha = cur_json["sha"]
        try:
            cur_content = base64.b64decode(cur_json["content"]).decode("utf-8")
            cur_obj = json.loads(cur_content)
            # Hash only the data portion (ignore generatedAt)
            def fingerprint(m):
                return json.dumps({k: v for k, v in m.items() if k != "generatedAt"}, sort_keys=True)
            if fingerprint(cur_obj) == fingerprint(manifest):
                return {"ok": True, "no_change": True, "objects_seen": len(objects), "manifest_bytes": len(new_bytes)}
        except Exception:
            pass
    else:
        cur_sha = None

    put = requests.put(
        f"{GITHUB_API}/repos/{repo}/contents/{path}",
        headers=headers,
        json={
            "message": f"sat: manifest rebuild ({len(iotd)} IOTD, {sum(s['total_frames'] for s in geo_summary.values())} geo frames, {sum(len(b['captures']) for b in bundles)} AOI captures)",
            "content": base64.b64encode(new_bytes).decode("ascii"),
            "branch": branch,
            **({"sha": cur_sha} if cur_sha else {}),
        },
        timeout=60,
    )
    if not put.ok:
        return {"ok": False, "github_status": put.status_code, "body": put.text[:400]}
    out = put.json()
    return {
        "ok": True,
        "commit": out.get("commit", {}).get("sha"),
        "objects_seen": len(objects),
        "manifest_bytes": len(new_bytes),
        "iotd": len(iotd),
        "global_days": len(global_days),
        "aoi_day_bundles": len(bundles),
        "geo_satellites": list(geo_summary.keys()),
    }


@app.local_entrypoint()
def main():
    print(rebuild.remote())
