"""
Landsat 8/9 (30m, 16-day revisit) daily AOI sweep via Earth-Search STAC.
Lower resolution than Sentinel-2 but pairs nicely for change-over-decades.

Deploy:
    modal deploy jobs/landsat_daily.py
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


app = modal.App("pursue-landsat-daily")
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


@app.function(image=image, secrets=SECRETS, schedule=modal.Cron("0 9 * * *"), timeout=600)
def capture() -> dict:
    storage = Storage.from_env()
    added = 0
    summary = []

    for aoi in INCIDENT_AOIS:
        features = search_recent("landsat-c2l2-sr", aoi.bbox, days_back=30, max_cloud=30.0, limit=1)
        if not features:
            summary.append({"aoi": aoi.id, "status": "no-scenes"})
            continue
        top = features[0]
        date = top["properties"]["datetime"][:10]
        prefix = f"incidents/{aoi.id}/{date}"
        assets = top.get("assets", {})
        thumb = assets.get("thumbnail") or assets.get("rendered_preview")
        if thumb and storage.remote_size(f"satellite/{prefix}/landsat-preview.jpg") is None:
            body = fetch_bytes(thumb["href"])
            if body:
                r = storage.put(f"{prefix}/landsat-preview.jpg", body, content_type="image/jpeg")
                added += 1

        meta = {
            "source": "landsat-c2l2-sr",
            "aoi_id": aoi.id,
            "date": date,
            "datetime_utc": top["properties"]["datetime"],
            "stac_id": top["id"],
            "platform": top["properties"].get("platform"),
            "cloud_cover_percent": top["properties"].get("eo:cloud_cover"),
            "bbox": top["bbox"],
            "asset_hrefs": {k: v.get("href") for k, v in assets.items()},
        }
        storage.put(f"{prefix}/meta-landsat.json",
                    json.dumps(meta, indent=2).encode("utf-8"),
                    content_type="application/json")
        summary.append({"aoi": aoi.id, "date": date})

    return {"added": added, "summary": summary}


@app.local_entrypoint()
def main():
    print(capture.remote())
