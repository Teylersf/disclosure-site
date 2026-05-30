# pursue.report · Modal pipeline

Serverless satellite-imagery archiver running on [Modal](https://modal.com).
Captures every-30-minute geostationary frames + daily polar mosaics + per-AOI
hi-res scenes across every UAP-incident location, and ships everything to
Linode Object Storage under the `satellite/` prefix.

Jobs deploy independently — you can disable any one at modal.com without
affecting the others.

## Layout

```
modal/
├── README.md
├── pyproject.toml
├── lib/
│   ├── __init__.py
│   ├── aois.py        # mirrored from src/lib/satellite-aois.ts
│   ├── storage.py     # Linode S3 client + dedupe helpers
│   ├── gibs.py        # NASA GIBS WMS URL builders
│   └── stac.py        # Earth-Search STAC client (Sentinel + Landsat)
└── jobs/
    ├── __init__.py
    ├── goes_30min.py        # every 30 min: GOES-East + GOES-West full-disc
    ├── himawari_30min.py    # every 30 min: Himawari-9 full-disc
    ├── meteosat_30min.py    # every 30 min: Meteosat full-disc
    ├── viirs_daily.py       # daily 04:00 UTC: VIIRS NOAA-20 + Suomi NPP
    ├── modis_daily.py       # daily 06:00 UTC: MODIS Terra + Aqua
    ├── sentinel2_daily.py   # daily: hi-res 10m per AOI via STAC
    ├── sentinel1_daily.py   # daily: SAR per AOI (cloud-piercing radar)
    ├── landsat_daily.py     # daily: Landsat 8/9 30m per AOI
    ├── iotd_daily.py        # daily 12:00 UTC: NASA EO Image of the Day
    └── manifest_rebuild.py  # daily 22:00 UTC: re-LIST bucket, regen satellite.json, git commit
```

## Storage layout on Linode

```
satellite/
├── geostationary/
│   ├── goes-east/<YYYY-MM-DD>/<HHMM>.jpg
│   ├── goes-west/<YYYY-MM-DD>/<HHMM>.jpg
│   ├── himawari/<YYYY-MM-DD>/<HHMM>.jpg
│   └── meteosat/<YYYY-MM-DD>/<HHMM>.jpg
├── polar-daily/
│   ├── viirs-noaa20-tc/<YYYY-MM-DD>.jpg
│   ├── viirs-snpp-tc/<YYYY-MM-DD>.jpg
│   ├── modis-terra-tc/<YYYY-MM-DD>.jpg
│   └── modis-aqua-tc/<YYYY-MM-DD>.jpg
├── incidents/<aoi-id>/<YYYY-MM-DD>/...
├── iotd/<YYYY-MM-DD>/...
└── gibs-global/<YYYY-MM-DD>/...
```

Existing data from the Node fetchers stays where it is — Modal jobs write to
the same paths and `manifest_rebuild` picks up both sources transparently.

## Setup

1. Install Modal CLI:

   ```bash
   pip install modal
   modal token new   # opens browser, sets ~/.modal.toml automatically
   ```

2. Create the Modal secret holding our env vars (Linode creds + GitHub token):

   ```bash
   cd modal
   modal secret create pursue-secrets \
     LINODE_ENDPOINT=https://us-east-1.linodeobjects.com \
     LINODE_REGION=us-east-1 \
     LINODE_BUCKET=disclosure \
     LINODE_ACCESS_KEY=... \
     LINODE_SECRET_KEY=... \
     GITHUB_TOKEN=... \
     GITHUB_REPO=Teylersf/disclosure-site \
     GITHUB_BRANCH=main
   ```

   (Or, easier: `modal secret create pursue-secrets --from-dotenv ../.env`)

3. Deploy any single job to verify:

   ```bash
   modal deploy jobs/goes_30min.py
   ```

   That spawns a scheduled function. Check it ran:

   ```bash
   modal app list
   modal app logs goes_30min
   ```

4. Deploy all jobs at once:

   ```bash
   make deploy   # see Makefile
   ```

## Cost expectations

- Modal compute: every job is a small Python container that runs for ~10–60 s.
  At Modal's price (~$0.0001/s for the smallest tier) a once-per-30-min job
  costs roughly $1/month. All jobs combined: under $10/month.
- Modal includes $30/month free credit. You'll likely never pay anything.
- Linode storage: ~3 TB/year ≈ $60/month at $0.02/GB. The "raw feed" pricing
  reality.
- Linode egress: free for the first 1 TB/month, then $0.005/GB.

## Disabling / pausing

Either disable a function on modal.com, or comment-out its `@app.function`
decorator and re-deploy. Captures already on Linode are never touched.
