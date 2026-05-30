"""
NASA GIBS WMS URL builders. GIBS exposes hundreds of imagery layers — these
helpers build a `GetMap` URL for any layer/bbox/date/dimensions combination.
For sub-daily layers (GOES, Himawari) the TIME parameter accepts minute
precision (ISO 8601 e.g. 2026-05-29T18:30:00Z).
"""
from __future__ import annotations

GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"


def wms_url(layer: str, bbox: tuple[float, float, float, float], time: str,
            width: int = 2048, height: int = 1024, fmt: str = "image/jpeg") -> str:
    """Build a WMS GetMap URL.

    - bbox is (minLng, minLat, maxLng, maxLat) and we swap to lat,lng for WMS 1.3.0
    - time accepts YYYY-MM-DD or full ISO 8601 with minute precision
    """
    from urllib.parse import urlencode
    params = {
        "SERVICE": "WMS",
        "REQUEST": "GetMap",
        "VERSION": "1.3.0",
        "LAYERS": layer,
        "STYLES": "",
        "FORMAT": fmt,
        "CRS": "EPSG:4326",
        "BBOX": f"{bbox[1]},{bbox[0]},{bbox[3]},{bbox[2]}",
        "WIDTH": str(width),
        "HEIGHT": str(height),
        "TIME": time,
    }
    return f"{GIBS_WMS}?{urlencode(params)}"


# Common layers — keep in sync with src/lib/gibs-layers.ts
GEOSTATIONARY_LAYERS = {
    "goes-east": "GOES-East_ABI_GeoColor",
    "goes-west": "GOES-West_ABI_GeoColor",
    "himawari": "Himawari_AHI_True_Color",
    "meteosat": "MSG_IODC_True_Color_OSI_SAF",  # may need adjustment
}

POLAR_DAILY_LAYERS = {
    "viirs-noaa20-tc": "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    "viirs-snpp-tc":   "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    "modis-terra-tc":  "MODIS_Terra_CorrectedReflectance_TrueColor",
    "modis-aqua-tc":   "MODIS_Aqua_CorrectedReflectance_TrueColor",
    "viirs-noaa20-fc": "VIIRS_NOAA20_CorrectedReflectance_BandsM11-I2-I1",
    "modis-terra-fc":  "MODIS_Terra_CorrectedReflectance_Bands721",
    "viirs-noaa20-fires": "VIIRS_NOAA20_Thermal_Anomalies_375m_Day",
    "viirs-noaa20-night":  "VIIRS_NOAA20_DayNightBand_ENCC",
}


def is_blank(body: bytes, min_bytes: int = 2000) -> bool:
    """GIBS returns a tiny all-grey JPEG when the requested TIME has no
    coverage for that layer. Treat anything under min_bytes as 'no data'."""
    return len(body) < min_bytes
