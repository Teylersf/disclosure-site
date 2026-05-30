"""
UAP-incident areas of interest. Mirrors src/lib/satellite-aois.ts so the
Modal jobs can run independently of the Next.js side.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Tuple
import math


@dataclass(frozen=True)
class Aoi:
    id: str
    name: str
    lat: float
    lng: float
    bbox: Tuple[float, float, float, float]  # minLng, minLat, maxLng, maxLat
    context: str


def _box(lat: float, lng: float, km_radius: float = 50.0) -> Tuple[float, float, float, float]:
    """Build a rough bbox around a centre point. ~111 km per degree of lat;
    longitude shrinks toward the poles."""
    d_lat = km_radius / 111.0
    d_lng = km_radius / (111.0 * max(0.1, math.cos(math.radians(lat))))
    return (lng - d_lng, lat - d_lat, lng + d_lng, lat + d_lat)


INCIDENT_AOIS: List[Aoi] = [
    Aoi("sandia-base-nm",     "Sandia Base, New Mexico", 35.0577, -106.5494, _box(35.0577, -106.5494),
        "1948–1950 UAP series — DOW-UAP-D017."),
    Aoi("lake-huron",         "Lake Huron",              44.5,    -82.5,    _box(44.5, -82.5, 80),
        "F-16 shoot-down of UAP, Feb 2023 — DOW-UAP-PR071."),
    Aoi("columbus-oh",        "Columbus, Ohio",          39.9612, -82.9988, _box(39.9612, -82.9988),
        "Multi-witness UAP encounter — DOW-UAP-PR073."),
    Aoi("eglin-afb",          "Eglin AFB, Florida",      30.4630, -86.5520, _box(30.4630, -86.5520),
        "Aircrew UAP observation — DOW-UAP-PR070."),
    Aoi("strait-of-hormuz",   "Strait of Hormuz",        26.5667, 56.2500,  _box(26.5667, 56.2500, 60),
        "Naval UAP encounters Sept & Oct 2020 — DOW-UAP-D062/D063."),
    Aoi("persian-gulf",       "Persian Gulf",            26.5,    51.5,    _box(26.5, 51.5, 80),
        "Multiple UAP formations — DOW-UAP-PR091, PR098."),
    Aoi("iran-tehran",        "Iran (Tehran region)",    35.7,    51.4,    _box(35.7, 51.4, 80),
        "DOW-UAP-D064 + DOW-UAP-PR050."),
    Aoi("syria",              "Syria",                   35.0,    38.0,    _box(35.0, 38.0, 100),
        "Syrian UAP instant acceleration — DOW-UAP-PR051."),
    Aoi("iraq",               "Iraq",                    33.0,    44.0,    _box(33.0, 44.0, 100),
        "Multiple CENTCOM AOR reports."),
    Aoi("papua-new-guinea",   "Papua New Guinea",        -6.3149, 143.9555, _box(-6.3149, 143.9555, 100),
        "State Dept cable 001, Jan 1985 — DOS-UAP-D1."),
    Aoi("kazakhstan",         "Kazakhstan",              48.0,    66.9237,  _box(48.0, 66.9237, 100),
        "State Dept cable 002, Jan 1994 — DOS-UAP-D2."),
    Aoi("white-sands-nm",     "White Sands, New Mexico", 32.3833, -106.4833, _box(32.3833, -106.4833),
        "Historical UAP cluster, NM proving grounds."),
]


def by_id(aoi_id: str) -> Aoi | None:
    for a in INCIDENT_AOIS:
        if a.id == aoi_id:
            return a
    return None
