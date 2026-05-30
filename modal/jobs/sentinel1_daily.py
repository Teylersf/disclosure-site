"""
Sentinel-1 SAR (radar — sees through clouds + at night) daily AOI sweep.
Captures the most recent IW GRD scene per AOI from the last 14 days.

Sentinel-1's STAC thumbnails are quick-look only and not as visually
appealing as Sentinel-2 — but the value is in seeing through any cloud
cover. We store the thumbnail + a link to the full GRD COG for power users.

Deploy:
    modal deploy jobs/sentinel1_daily.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import json

import modal
import requests

from lib.stac import search_recent
from lib.aois import INCIDENT_AOIS
from lib.storage import Storage


app = modal.App("pursue-sentinel1-daily")
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "boto3>=1.34", "requests>=2.31",
)
SECRETS = [modal.Secret.from_name("pursue-secrets")]


def fetch_bytes(url: str, timeout: int = 60) -> bytes | None:
    try:
        r = requests.get(url, timeout=timeout)
        if not r.ok or len(r.content) < 1000:
            return None
        return r.content
    except Exception:
        return None


@app.function(image=image, secrets=SECRETS, schedule=modal.Cron("0 8 * * *"), timeout=600)
def capture() -> dict:
    storage = Storage.from_env()
    added = 0
    summary = []

    for aoi in INCIDENT_AOIS:
        # Sentinel-1 has no cloud cover concept (it's radar)
        features = search_recent("sentinel-1-grd", aoi.bbox, days_back=14, max_cloud=None, limit=1)
        if not features:
            summary.append({"aoi": aoi.id, "status": "no-scenes"})
            continue
        top = features[0]
        date = top["properties"]["datetime"][:10]
        prefix = f"incidents/{aoi.id}/{date}"
        assets = top.get("assets", {})
        thumb = assets.get("thumbnail") or assets.get("preview")
        if thumb and storage.remote_size(f"satellite/{prefix}/sentinel1-preview.jpg") is None:
            body = fetch_bytes(thumb["href"])
            if body:
                r = storage.put(f"{prefix}/sentinel1-preview.jpg", body, content_type="image/jpeg")
                added += 1

        meta = {
            "source": "sentinel-1-grd",
            "aoi_id": aoi.id,
            "date": date,
            "datetime_utc": top["properties"]["datetime"],
            "stac_id": top["id"],
            "platform": top["properties"].get("platform"),
            "polarizations": top["properties"].get("sar:polarizations"),
            "instrument_mode": top["properties"].get("sar:instrument_mode"),
            "bbox": top["bbox"],
            "asset_hrefs": {k: v.get("href") for k, v in assets.items()},
        }
        storage.put(f"{prefix}/meta-sentinel1.json",
                    json.dumps(meta, indent=2).encode("utf-8"),
                    content_type="application/json")
        summary.append({"aoi": aoi.id, "date": date})

    return {"added": added, "summary": summary}


@app.local_entrypoint()
def main():
    print(capture.remote())
