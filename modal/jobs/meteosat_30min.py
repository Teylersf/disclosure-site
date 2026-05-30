"""
Capture Meteosat (Europe/Africa) full-disc true color every 30 minutes via GIBS.
Note: GIBS' Meteosat coverage is partial; if no frame is available we just
no-op and the next run will catch up.

Deploy:
    modal deploy jobs/meteosat_30min.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timedelta, timezone

import modal
import requests

from lib.gibs import wms_url
from lib.storage import Storage


app = modal.App("pursue-meteosat-30min")
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "boto3>=1.34", "requests>=2.31",
)
SECRETS = [modal.Secret.from_name("pursue-secrets")]

METEOSAT_BBOX = (-65.0, -65.0, 65.0, 65.0)
LAYER = "MSG_IODC_True_Color_OSI_SAF"


def round_to_15min(now: datetime) -> datetime:
    minute = (now.minute // 15) * 15
    return now.replace(minute=minute, second=0, microsecond=0) - timedelta(minutes=20)


@app.function(image=image, secrets=SECRETS, schedule=modal.Cron("*/30 * * * *"), timeout=180)
def capture() -> dict:
    now = datetime.now(timezone.utc)
    frame_at = round_to_15min(now)
    time_iso = frame_at.strftime("%Y-%m-%dT%H:%M:%SZ")
    date_str = frame_at.strftime("%Y-%m-%d")
    hhmm = frame_at.strftime("%H%M")

    url = wms_url(LAYER, METEOSAT_BBOX, time_iso, width=2048, height=2048)
    try:
        r = requests.get(url, timeout=60)
        if not r.ok or len(r.content) < 4000:
            return {"ok": False, "frame_at": time_iso, "status": r.status_code if r else None}
    except Exception as e:
        return {"ok": False, "frame_at": time_iso, "error": str(e)}

    storage = Storage.from_env()
    key = f"geostationary/meteosat/{date_str}/{hhmm}.jpg"
    res = storage.put(key, r.content, content_type="image/jpeg")
    return {"ok": True, "frame_at": time_iso, "key": res["key"], "skipped": res["skipped"], "size": res["size"]}


@app.local_entrypoint()
def main():
    print(capture.remote())
