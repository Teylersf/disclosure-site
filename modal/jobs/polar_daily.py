"""
Daily polar imagery sweep: all VIIRS + MODIS layers, both per-AOI and as a
global mosaic. Replaces what the Node fetch-gibs.ts script was doing locally.

Deploy:
    modal deploy jobs/polar_daily.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timedelta, timezone

import modal
import requests

from lib.gibs import wms_url, is_blank
from lib.aois import INCIDENT_AOIS
from lib.storage import Storage


app = modal.App("pursue-polar-daily")
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "boto3>=1.34", "requests>=2.31",
)
SECRETS = [modal.Secret.from_name("pursue-secrets")]


AOI_LAYERS = [
    ("viirs-noaa20-truecolor",  "VIIRS_NOAA20_CorrectedReflectance_TrueColor"),
    ("viirs-snpp-truecolor",    "VIIRS_SNPP_CorrectedReflectance_TrueColor"),
    ("modis-terra-truecolor",   "MODIS_Terra_CorrectedReflectance_TrueColor"),
    ("modis-aqua-truecolor",    "MODIS_Aqua_CorrectedReflectance_TrueColor"),
    ("viirs-noaa20-night",      "VIIRS_NOAA20_DayNightBand_ENCC"),
    ("viirs-noaa20-fires",      "VIIRS_NOAA20_Thermal_Anomalies_375m_Day"),
    ("modis-terra-thermal",     "MODIS_Terra_Thermal_Anomalies_All"),
    ("modis-aqua-cloudtop-temp","MODIS_Aqua_Cloud_Top_Temp_Day"),
]


def fetch(url: str) -> bytes | None:
    try:
        r = requests.get(url, timeout=60)
        if not r.ok or is_blank(r.content):
            return None
        return r.content
    except Exception:
        return None


@app.function(image=image, secrets=SECRETS, schedule=modal.Cron("0 5 * * *"), timeout=600)
def capture(date: str | None = None) -> dict:
    """Run for one specific date (default: yesterday UTC)."""
    if date is None:
        d = datetime.now(timezone.utc) - timedelta(days=1)
        date = d.strftime("%Y-%m-%d")

    storage = Storage.from_env()
    added = skipped = no_data = 0
    bytes_total = 0

    # 1) Per-AOI captures
    for aoi in INCIDENT_AOIS:
        for layer_id, layer in AOI_LAYERS:
            key = f"incidents/{aoi.id}/{date}/{layer_id}.jpg"
            if storage.remote_size(key) is not None:
                skipped += 1
                continue
            url = wms_url(layer, aoi.bbox, date, width=1024, height=1024)
            body = fetch(url)
            if body is None:
                no_data += 1
                continue
            r = storage.put(key, body, content_type="image/jpeg")
            added += 1
            bytes_total += r["size"]

    # 2) Global daily mosaic (VIIRS NOAA-20 true color, full Earth)
    key_global = f"gibs-global/{date}/viirs-noaa20-truecolor.jpg"
    if storage.remote_size(key_global) is None:
        url = wms_url("VIIRS_NOAA20_CorrectedReflectance_TrueColor",
                      (-180.0, -90.0, 180.0, 90.0), date, width=2048, height=1024)
        body = fetch(url)
        if body is not None:
            r = storage.put(key_global, body, content_type="image/jpeg")
            added += 1
            bytes_total += r["size"]
    else:
        skipped += 1

    return {"date": date, "added": added, "skipped": skipped, "no_data": no_data, "bytes": bytes_total}


@app.local_entrypoint()
def main(date: str | None = None):
    print(capture.remote(date))
