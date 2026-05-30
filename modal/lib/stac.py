"""
STAC search wrapper for Earth-Search on AWS — provides Sentinel-2 L2A,
Sentinel-1 GRD, Landsat 8/9 C2 L2.
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Optional
import requests

STAC = "https://earth-search.aws.element84.com/v1/search"


def search_recent(collection: str, bbox: tuple[float, float, float, float],
                  days_back: int = 30, max_cloud: Optional[float] = 30.0,
                  limit: int = 10) -> list[dict]:
    """Find the N most recent STAC items intersecting bbox.

    - collection: e.g. 'sentinel-2-l2a', 'sentinel-1-grd', 'landsat-c2l2-sr'
    - max_cloud: only used for collections that report eo:cloud_cover
    """
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days_back)
    body: dict = {
        "collections": [collection],
        "bbox": list(bbox),
        "datetime": f"{start.isoformat()}/{end.isoformat()}",
        "limit": limit,
        "sortby": [{"field": "properties.datetime", "direction": "desc"}],
    }
    if max_cloud is not None:
        body["query"] = {"eo:cloud_cover": {"lt": max_cloud}}
    r = requests.post(STAC, json=body, timeout=30)
    r.raise_for_status()
    return r.json().get("features", [])
