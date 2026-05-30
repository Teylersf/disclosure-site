"""
Sentinel-2 (10m, ~5-day revisit) daily AOI sweep via the public Earth-Search
STAC API. For each AOI, find the most recent <30% cloud scene from the last
30 days and snapshot its preview + rendered thumbnail.

Deploy:
    modal deploy jobs/sentinel2_daily.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timezone
import json

import modal
import requests

from lib.stac import search_recent
from lib.aois import INCIDENT_AOIS
from lib.storage import Storage


app = modal.App("pursue-sentinel2-daily")
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


@app.function(image=image, secrets=SECRETS, schedule=modal.Cron("0 7 * * *"), timeout=900)
def capture() -> dict:
    storage = Storage.from_env()
    added = 0
    skipped = 0
    bytes_total = 0
    summary = []

    for aoi in INCIDENT_AOIS:
        features = search_recent("sentinel-2-l2a", aoi.bbox, days_back=30, max_cloud=30.0, limit=1)
        if not features:
            summary.append({"aoi": aoi.id, "status": "no-scenes"})
            continue
        top = features[0]
        date = top["properties"]["datetime"][:10]
        assets = top.get("assets", {})
        preview = assets.get("thumbnail") or assets.get("preview")
        rendered = assets.get("rendered_preview")
        visual = assets.get("visual")

        if not preview and not rendered:
            summary.append({"aoi": aoi.id, "status": "no-preview"})
            continue

        prefix = f"incidents/{aoi.id}/{date}"
        added_here = 0
        bytes_here = 0

        # Preview
        if preview and storage.remote_size(f"satellite/{prefix}/sentinel2-preview.jpg") is None:
            body = fetch_bytes(preview["href"])
            if body:
                r = storage.put(f"{prefix}/sentinel2-preview.jpg", body, content_type="image/jpeg")
                added_here += 1
                bytes_here += r["size"]

        # Rendered (better quality)
        if rendered and storage.remote_size(f"satellite/{prefix}/sentinel2-rendered.jpg") is None:
            body = fetch_bytes(rendered["href"])
            if body:
                r = storage.put(f"{prefix}/sentinel2-rendered.jpg", body, content_type="image/jpeg")
                added_here += 1
                bytes_here += r["size"]

        # Metadata
        meta = {
            "source": "sentinel-2-l2a",
            "aoi_id": aoi.id,
            "aoi_name": aoi.name,
            "date": date,
            "datetime_utc": top["properties"]["datetime"],
            "stac_id": top["id"],
            "cloud_cover_percent": top["properties"].get("eo:cloud_cover"),
            "platform": top["properties"].get("platform"),
            "bbox": top["bbox"],
            "assets": {
                "preview": {"file": "sentinel2-preview.jpg"},
                "rendered": {"file": "sentinel2-rendered.jpg"} if rendered else None,
                "visual_cog_url": visual["href"] if visual else None,
            },
        }
        storage.put(f"{prefix}/meta-sentinel2.json",
                    json.dumps(meta, indent=2).encode("utf-8"),
                    content_type="application/json")

        added += added_here
        bytes_total += bytes_here
        if added_here == 0:
            skipped += 1
        summary.append({"aoi": aoi.id, "date": date, "added": added_here, "cloud": top["properties"].get("eo:cloud_cover")})

    return {"added": added, "skipped": skipped, "bytes": bytes_total, "summary": summary}


@app.local_entrypoint()
def main():
    print(capture.remote())
