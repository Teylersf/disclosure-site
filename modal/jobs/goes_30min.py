"""
Capture GOES-East and GOES-West full-disc GeoColor every 30 minutes.

Each run:
  - Computes the most recent 10-min-aligned frame timestamp (GIBS lags ~10 min)
  - Fetches both satellites' true-color full-disc images via GIBS WMS
  - Uploads to Linode at satellite/geostationary/<sat>/<YYYY-MM-DD>/<HHMM>.jpg

Deploy:
    cd modal
    modal deploy jobs/goes_30min.py

Manually trigger one capture:
    modal run jobs/goes_30min.py::capture
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timedelta, timezone
import io

import modal
import requests
from PIL import Image

from lib.gibs import wms_url
from lib.storage import Storage


app = modal.App("pursue-goes-30min")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("boto3>=1.34", "requests>=2.31", "Pillow>=10.0")
)

SECRETS = [modal.Secret.from_name("pursue-secrets")]

SATS = [
    # (id, GIBS layer, full-disc bbox)
    ("goes-east", "GOES-East_ABI_GeoColor", (-135.0, -65.0, -15.0, 65.0)),
    ("goes-west", "GOES-West_ABI_GeoColor", (-180.0, -65.0, -90.0, 65.0)),
]


def round_to_10min(now: datetime) -> datetime:
    """GIBS publishes GOES every 10 min; round DOWN, then back off 15 min so
    we don't ask for a frame that hasn't been ingested yet."""
    minute = (now.minute // 10) * 10
    aligned = now.replace(minute=minute, second=0, microsecond=0)
    return aligned - timedelta(minutes=15)


def fetch_jpeg(url: str, timeout: int = 60) -> bytes | None:
    try:
        r = requests.get(url, timeout=timeout)
        if not r.ok or len(r.content) < 4000:
            return None
        return r.content
    except Exception:
        return None


@app.function(image=image, secrets=SECRETS, schedule=modal.Cron("*/30 * * * *"), timeout=180)
def capture() -> dict:
    now = datetime.now(timezone.utc)
    frame_at = round_to_10min(now)
    time_iso = frame_at.strftime("%Y-%m-%dT%H:%M:%SZ")
    date_str = frame_at.strftime("%Y-%m-%d")
    hhmm = frame_at.strftime("%H%M")

    storage = Storage.from_env()
    results = []
    total_bytes = 0
    for sat_id, layer, bbox in SATS:
        url = wms_url(layer, bbox, time_iso, width=2048, height=2048)
        body = fetch_jpeg(url)
        if body is None:
            results.append({"sat": sat_id, "ok": False, "frame_at": time_iso})
            continue
        key = f"geostationary/{sat_id}/{date_str}/{hhmm}.jpg"
        r = storage.put(key, body, content_type="image/jpeg")
        total_bytes += r["size"]
        results.append({"sat": sat_id, "ok": True, "key": r["key"], "skipped": r["skipped"], "size": r["size"], "frame_at": time_iso})

    return {"frame_at": time_iso, "results": results, "bytes": total_bytes}


@app.local_entrypoint()
def main():
    """Trigger one capture from the local CLI for testing.
    Run with:  modal run jobs/goes_30min.py
    """
    out = capture.remote()
    print(out)
