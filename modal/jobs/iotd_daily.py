"""
NASA Earth Observatory Image of the Day daily mirror.
Pulls the public RSS feed (now redirects to science.nasa.gov/feed) and
captures any IOTD entries not yet on Linode.

Deploy:
    modal deploy jobs/iotd_daily.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime
import json
import re

import modal
import requests

from lib.storage import Storage


app = modal.App("pursue-iotd-daily")
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "boto3>=1.34", "requests>=2.31",
)
SECRETS = [modal.Secret.from_name("pursue-secrets")]


RSS_URL = "https://earthobservatory.nasa.gov/feeds/image-of-the-day.rss"
UA = "Mozilla/5.0 (compatible; pursue.report/1.0; +https://pursue.report)"


def parse_rss(xml: str) -> list[dict]:
    out = []
    for m in re.finditer(r"<item>([\s\S]*?)</item>", xml):
        body = m.group(1)
        def get(tag: str) -> str:
            mm = re.search(rf"<{tag}>([\s\S]*?)</{tag}>", body)
            if not mm: return ""
            v = mm.group(1).strip()
            v = re.sub(r"^<!\[CDATA\[", "", v)
            v = re.sub(r"\]\]>$", "", v)
            return v.strip()
        title = get("title")
        link = get("link")
        pub = get("pubDate")
        desc = get("description")
        ce = re.search(r"<content:encoded>([\s\S]*?)</content:encoded>", body)
        content = ce.group(1).replace("<![CDATA[", "").replace("]]>", "") if ce else ""
        # First non-svg img
        img = ""
        for im in re.finditer(r"<img[^>]+src=[\"']([^\"']+)[\"']", content):
            u = im.group(1)
            if u.endswith(".svg") or "avatar" in u or "gravatar" in u or "sprite" in u:
                continue
            img = u
            break
        if not img:
            im = re.search(r"<img[^>]+src=[\"']([^\"']+)[\"']", desc)
            if im: img = im.group(1)
        if not img: continue
        try:
            d = datetime.strptime(pub, "%a, %d %b %Y %H:%M:%S %z")
            date = d.strftime("%Y-%m-%d")
        except Exception:
            continue
        out.append({"date": date, "title": title, "link": link, "description": desc, "image_url": img, "pubDate": pub})
    return out


@app.function(image=image, secrets=SECRETS, schedule=modal.Cron("0 14 * * *"), timeout=300)
def capture() -> dict:
    storage = Storage.from_env()
    r = requests.get(RSS_URL, headers={"User-Agent": UA}, timeout=30)
    if not r.ok:
        return {"ok": False, "status": r.status_code}
    entries = parse_rss(r.text)
    added = 0
    skipped = 0
    for e in entries:
        key_img = f"iotd/{e['date']}/image.jpg"
        if storage.remote_size(f"satellite/{key_img}") is not None:
            skipped += 1
            continue
        ri = requests.get(e["image_url"], headers={"User-Agent": UA}, timeout=60)
        if not ri.ok or len(ri.content) < 1000:
            continue
        storage.put(key_img, ri.content, content_type="image/jpeg")
        meta = {
            "source": "nasa-eo-iotd",
            "date": e["date"],
            "title": e["title"],
            "link": e["link"],
            "description": re.sub(r"<[^>]+>", "", e["description"]).strip()[:4000],
            "pubDate": e["pubDate"],
            "image": {"file": "image.jpg", "source_url": e["image_url"], "size_bytes": len(ri.content)},
        }
        storage.put(f"iotd/{e['date']}/meta.json",
                    json.dumps(meta, indent=2).encode("utf-8"),
                    content_type="application/json")
        added += 1
    return {"added": added, "skipped": skipped, "total_in_feed": len(entries)}


@app.local_entrypoint()
def main():
    print(capture.remote())
