# pursue.report — Satellite Imagery System Documentation

**Last updated:** 2026-06-26  
**Prepared for:** Website developer handoff  
**Current manifest totals:** 27 IOTD · 28 global · 346 incident-days

---

## Overview

The satellite feature on pursue.report automatically archives daily satellite imagery from three sources and serves it through a static JSON manifest that Vercel reads at build time. A scheduled routine runs every day to fetch new images, rebuild the manifest, and push the commit — no manual steps needed except uploading the actual image files to Linode (see step 7 below).

---

## Data Sources

### 1. NASA Earth Observatory Image of the Day (IOTD)
- **What it is:** One editorial satellite photograph from NASA per day, with a title and description.
- **RSS feed:** `https://earthobservatory.nasa.gov/feeds/earth-observatory.rss`
- **Script:** `scripts/satellite/fetch-iotd.ts`
- **Storage:** `data/satellite/iotd/<YYYY-MM-DD>/image.jpg`
- **Hosting:** Uploaded to Linode at `https://disclosure.us-east-1.linodeobjects.com/satellite/iotd/<date>/image.jpg`
- **Current count:** 27 entries (going back to ~2026-05-19)
- **Note:** NASA sometimes returns HTTP 404 for the current day; the script skips those gracefully and retries the next day.

### 2. NASA GIBS — Incident AOI Tiles
- **What it is:** Daily satellite captures cropped to 12 geographic areas of interest (AOIs), each tied to a documented UAP incident.
- **API:** NASA GIBS WMTS (`gibs.earthdata.nasa.gov`)
- **Script:** `scripts/satellite/fetch-gibs.ts`
- **Cadence:** Runs for D-1 (yesterday UTC) every day.
- **Storage:** `data/satellite/incidents/<aoi-id>/<YYYY-MM-DD>/<layer-id>.jpg` + `meta.json`
- **Hosting:** `https://disclosure.us-east-1.linodeobjects.com/satellite/incidents/<aoi-id>/<date>/<file>`
- **Global mosaic:** Also fetches a 2048×1024 full-disc VIIRS mosaic → `data/satellite/gibs-global/<YYYY-MM-DD>/viirs-noaa20-truecolor.jpg`
- **Current coverage:** 28 global days, 346 incident-days across 12 AOIs

#### Layers fetched per AOI per day (7 tiles; 1 is "no-data" layer flagged but still captured):

| File | Sensor | Layer Name | Resolution |
|------|--------|-----------|------------|
| `viirs-noaa20-truecolor.jpg` | VIIRS NOAA-20 | True Color | 375 m |
| `viirs-snpp-truecolor.jpg` | VIIRS Suomi NPP | True Color | 375 m |
| `modis-terra-truecolor.jpg` | MODIS Terra | True Color | 250 m |
| `modis-aqua-truecolor.jpg` | MODIS Aqua | True Color | 250 m |
| `viirs-noaa20-fires.jpg` | VIIRS NOAA-20 | Active Fires / Thermal Anomalies | 375 m |
| `modis-terra-thermal.jpg` | MODIS Terra | Thermal Anomalies | 1000 m |
| `modis-aqua-cloudtop-temp.jpg` | MODIS Aqua | Cloud-Top Temperature | 1000 m |

### 3. Sentinel-2 (10 m High-Resolution)
- **What it is:** The most recent Sentinel-2 L2A scene for each AOI with ≤30% cloud cover, refreshed daily.
- **API:** Earth-Search free STAC API (`earth-search.aws.element84.com/v1`)
- **Script:** `scripts/satellite/fetch-sentinel2.ts`
- **Lookback window:** 30 days; picks the most recent qualifying scene.
- **Storage:** `data/satellite/incidents/<aoi-id>/<YYYY-MM-DD>/sentinel2-preview.jpg` + `meta-sentinel2.json`
- **Hosting:** Same Linode bucket as GIBS tiles.
- **Today's new scene:** Iraq, 2026-06-26 (cloud cover: 0.055%, Sentinel-2A, STAC ID: `S2A_38SMB_20260626_1_L2A`)

---

## AOIs — Areas of Interest

All 12 AOIs are tied to declassified government UAP records. Each has a lat/lng center, a bounding box, a short context string, and optional linked document record IDs.

| ID | Display Name | Lat | Lng | Linked Record(s) |
|----|-------------|-----|-----|-----------------|
| `sandia-base-nm` | Sandia Base, New Mexico | 35.0577 | -106.5494 | DOW-UAP-D017 |
| `lake-huron` | Lake Huron | 44.5 | -82.5 | DOW-UAP-PR071 |
| `columbus-oh` | Columbus, Ohio | 39.9612 | -82.9988 | DOW-UAP-PR073 |
| `eglin-afb` | Eglin AFB, Florida | 30.463 | -86.552 | DOW-UAP-PR070 |
| `strait-of-hormuz` | Strait of Hormuz | 26.5667 | 56.25 | DOW-UAP-D062, D063 |
| `persian-gulf` | Persian Gulf | 26.5 | 51.5 | DOW-UAP-PR091, PR098 |
| `iran-tehran` | Iran (Tehran region) | 35.7 | 51.4 | DOW-UAP-D064 |
| `syria` | Syria | 35.0 | 38.0 | DOW-UAP-PR051 |
| `iraq` | Iraq | 33.0 | 44.0 | Multiple CENTCOM AOR reports |
| `papua-new-guinea` | Papua New Guinea | -6.3149 | 143.9555 | DOS-UAP-D1 |
| `kazakhstan` | Kazakhstan | 48.0 | 66.9237 | DOS-UAP-D2 |
| `white-sands-nm` | White Sands, New Mexico | 32.3833 | -106.4833 | Historical cluster |

---

## File & Folder Structure

```
data/satellite/
├── iotd/
│   └── <YYYY-MM-DD>/
│       └── image.jpg
├── gibs-global/
│   └── <YYYY-MM-DD>/
│       ├── meta.json
│       └── viirs-noaa20-truecolor.jpg
└── incidents/
    └── <aoi-id>/
        └── <YYYY-MM-DD>/
            ├── meta.json                  ← GIBS metadata (layers, bbox, sizes)
            ├── meta-sentinel2.json        ← Sentinel-2 metadata (if a scene exists for that date)
            ├── viirs-noaa20-truecolor.jpg
            ├── viirs-snpp-truecolor.jpg
            ├── modis-terra-truecolor.jpg
            ├── modis-aqua-truecolor.jpg
            ├── viirs-noaa20-fires.jpg
            ├── modis-terra-thermal.jpg
            ├── modis-aqua-cloudtop-temp.jpg
            └── sentinel2-preview.jpg      ← only present when Sentinel-2 has a scene for that date
```

---

## The Manifest — `src/lib/satellite.json`

This is the single file the front-end reads. It is rebuilt by `npm run manifest:satellite` every day and committed to the repo. Vercel picks it up on each deployment.

**Top-level shape:**

```json
{
  "generatedAt": "2026-06-26T...",
  "aois": [ /* array of AOI definitions */ ],
  "iotd": [ /* array of IOTD entries, newest first */ ],
  "global": [ /* array of global mosaic entries, newest first */ ],
  "incidentDays": [ /* array of per-AOI per-day capture sets */ ]
}
```

### `aois[]` entry

```json
{
  "id": "iraq",
  "name": "Iraq",
  "lat": 33,
  "lng": 44,
  "bbox": [42.926, 32.099, 45.074, 33.901],
  "context": "Multiple CENTCOM AOR UAP reports.",
  "records": ["optional-linked-record-ids"]
}
```

### `iotd[]` entry

```json
{
  "date": "2026-06-25",
  "title": "A Turquoise Tint for the Black Sea",
  "link": "https://science.nasa.gov/...",
  "description": "Phytoplankton added a milky blue hue...",
  "image_url": "https://disclosure.us-east-1.linodeobjects.com/satellite/iotd/2026-06-25/image.jpg",
  "size_bytes": 754438
}
```

### `global[]` entry

```json
{
  "date": "2026-06-25",
  "url": "https://disclosure.us-east-1.linodeobjects.com/satellite/gibs-global/2026-06-25/viirs-noaa20-truecolor.jpg",
  "size_bytes": 542661
}
```

### `incidentDays[]` entry

```json
{
  "aoi_id": "iraq",
  "date": "2026-06-25",
  "captures": [
    {
      "source": "VIIRS NOAA-20 True Color",
      "layer": "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
      "file": "viirs-noaa20-truecolor.jpg",
      "url": "https://disclosure.us-east-1.linodeobjects.com/satellite/incidents/iraq/2026-06-25/viirs-noaa20-truecolor.jpg",
      "size_bytes": 58437,
      "resolution_m": 375
    }
    /* ... 6 more capture objects ... */
  ]
}
```

Sentinel-2 days have their own entry in `incidentDays` (or an additional capture object within the same date — check the manifest builder if adding UI for it).

---

## npm Scripts

| Command | What it does |
|---------|-------------|
| `npm run sat:fetch-iotd` | Pulls NASA IOTD RSS, downloads any new images |
| `npm run sat:fetch-gibs` | Fetches D-1 GIBS tiles for all 12 AOIs + global mosaic |
| `npm run sat:fetch-sentinel2` | Refreshes latest ≤30%-cloud Sentinel-2 scene per AOI |
| `npm run sat:fetch-all` | Runs all three fetchers in sequence |
| `npm run manifest:satellite` | Rebuilds `src/lib/satellite.json` from `data/satellite/` |
| `npm run upload:satellite` | **Run locally only** — uploads JPEGs to Linode object storage |

---

## Daily Automation (what the scheduled routine does)

The routine runs once per day (cloud-hosted, no local machine needed):

1. `npm install`
2. Configure git identity
3. `npm run sat:fetch-iotd`
4. `npm run sat:fetch-gibs`
5. `npm run sat:fetch-sentinel2`
6. `npm run manifest:satellite`
7. If `src/lib/satellite.json` or `data/satellite/` changed → commit and `git push origin main`
8. **Does NOT run `upload:satellite`** — that requires `LINODE_*` env vars not present in the cloud environment

After the push, Vercel auto-deploys and the new manifest is live. The actual image files at the Linode URLs are uploaded separately by the site owner running `npm run upload:satellite` locally (this pushes the JPEGs from `data/satellite/` to the Linode bucket).

---

## Image Hosting

All images are served from Linode Object Storage:

```
https://disclosure.us-east-1.linodeobjects.com/satellite/
  ├── iotd/<YYYY-MM-DD>/image.jpg
  ├── gibs-global/<YYYY-MM-DD>/viirs-noaa20-truecolor.jpg
  └── incidents/<aoi-id>/<YYYY-MM-DD>/<layer-file>.jpg
```

The `.env` file (gitignored) holds `LINODE_ENDPOINT`, `LINODE_ACCESS_KEY`, and `LINODE_SECRET_KEY`. These are needed only for `upload:satellite` and are never committed.

---

## Today's Run Summary (2026-06-26)

| Source | New | Cached / Skipped |
|--------|-----|-----------------|
| NASA IOTD | 0 (today's image 404'd; 9 already present) | 9 |
| GIBS AOI tiles | 84 new captures (12 AOIs × 7 layers for 2026-06-25) | 0 |
| GIBS global mosaic | 1 (2026-06-25) | 0 |
| Sentinel-2 | 1 new (Iraq, 2026-06-26, 0.055% cloud) | 11 cached |

**Commit:** `0798477` — `sat: daily refresh (2026-06-26)`  
**Manifest after rebuild:** 27 IOTD · 28 global · 346 incident-days  
**Live URL:** https://pursue.report/satellite
