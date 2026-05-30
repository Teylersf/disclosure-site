"""
Capture Himawari-9 AHI True Color every 30 minutes (Asia/Pacific full-disc).

Deploy:
    modal deploy jobs/himawari_30min.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timedelta, timezone

import modal
import requests

from lib.gibs import wms_url
from lib.storage import Storage


app = modal.App("pursue-himawari-30min")
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "boto3>=1.34", "requests>=2.31",
)
SECRETS = [modal.Secret.from_name("pursue-secrets")]

HIMAWARI_BBOX = (80.0, -60.0, 200.0, 60.0)  # crosses dateline
LAYER = "Himawari_AHI_True_Color"


def round_to_10min(now: datetime) -> datetime:
    minute = (now.minute // 10) * 10
    return now.replace(minute=minute, second=0, microsecond=0) - timedelta(minutes=15)


@app.function(image=image, secrets=SECRETS, schedule=modal.Cron("*/30 * * * *"), timeout=180)
def capture() -> dict:
    now = datetime.now(timezone.utc)
    frame_at = round_to_10min(now)
    time_iso = frame_at.strftime("%Y-%m-%dT%H:%M:%SZ")
    date_str = frame_at.strftime("%Y-%m-%d")
    hhmm = frame_at.strftime("%H%M")

    url = wms_url(LAYER, HIMAWARI_BBOX, time_iso, width=2048, height=2048)
    try:
        r = requests.get(url, timeout=60)
        if not r.ok or len(r.content) < 4000:
            return {"ok": False, "frame_at": time_iso, "status": r.status_code if r else "no-response"}
    except Exception as e:
        return {"ok": False, "frame_at": time_iso, "error": str(e)}

    storage = Storage.from_env()
    key = f"geostationary/himawari/{date_str}/{hhmm}.jpg"
    res = storage.put(key, r.content, content_type="image/jpeg")
    return {"ok": True, "frame_at": time_iso, "key": res["key"], "skipped": res["skipped"], "size": res["size"]}


@app.local_entrypoint()
def main():
    print(capture.remote())
