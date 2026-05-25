# Disclosure

The ultimate viewer for the U.S. Department of War **PURSUE** 2026 UAP archive — 222 declassified records from two releases, with TV mode, EXIF reading, full-text search, and Linode Object Storage backing.

Built on Next.js 16 + React 19 + Tailwind 4. Reads the local mirror in `..` (the `DISCLOUSRE/` folder) and either serves files through a built-in local proxy (dev) or fetches them from Linode Object Storage (production).

## Quick start

```bash
# from this folder
npm install
npm run dev
# open http://localhost:3000
```

That's it — the app reads the mirror folder one level up and streams every PDF, video, image, and audio file directly. No upload required for local development.

## Features

- **Home** — hero, stat cards (122 PDFs / 78 videos / 8 audios / 14 images / 7 agencies), and a filterable gallery of all 222 records.
- **/search** — full-text across title, description, agency, and location. URL-synced for shareable links.
- **/records/[id]** — per-record view with native PDF embed / `<video>` with captions / image viewer, full metadata sidebar, and **EXIF panel** (powered by `exifr`).
- **/tv** — autoplay queue cycling through every video & audio record (`Space`, `← →`, `M`, `S`, `L`, `B` shortcuts; shuffle, loop, filter by type).
- **/bundles** — direct download links to the four official ZIP bundles (8.3 GB total).

## Data model

A single TypeScript-typed manifest is generated at build time by
`scripts/build-manifest.ts`. It reads:

- `../www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv` — the combined 222-record CSV
- `../api.dvidshub.net/asset/video-*.json` — DVIDS metadata for every video/audio (URLs, captions, duration, dimensions)

Output: `src/lib/manifest.json` — imported statically by every page.

Regenerate it any time you re-sync the mirror:

```bash
npm run manifest
```

`prebuild` runs it automatically before `next build`.

## Storage — Linode Object Storage

Single `.env` file. Drop your S3-compatible credentials in and run one
command to push the whole mirror to your bucket.

### Configure `.env`

```ini
LINODE_ENDPOINT=https://us-east-1.linodeobjects.com
LINODE_REGION=us-east-1
LINODE_BUCKET=disclosure
LINODE_ACCESS_KEY=<paste here>
LINODE_SECRET_KEY=<paste here>

# After upload, switch the app to read from Linode:
NEXT_PUBLIC_ASSET_BASE_URL=https://disclosure.us-east-1.linodeobjects.com
```

### Upload

```bash
npm run upload:dry   # preview what would upload
npm run upload       # for real (resumes — skips already-present files)
```

- Resumable: a `HEAD` request decides skip vs upload by matching size.
- Parallel: 8 streams by default; tune with `UPLOAD_CONCURRENCY=16`.
- Public: every object goes up with `ACL: public-read` and a 1-day cache.
- Selective: only the mirrored host folders ship — your local waifu2x upscales are skipped automatically.

Once uploaded, set `NEXT_PUBLIC_ASSET_BASE_URL` and restart `npm run dev`
(or rebuild). The asset helper switches transparently to bucket URLs.

## How asset URLs work

Every record stores an **asset key** like `www.war.gov/medialink/ufo/release_1/foo.pdf` (mirror path) or `d34w7g4gy10iej.cloudfront.net/video/.../bar.mp4`.

`assetUrl(key)` resolves it:

- `NEXT_PUBLIC_ASSET_BASE_URL` set → `<base>/<key>` (Linode)
- otherwise → `/api/asset/<key>` (local proxy reads from `../`)

The proxy supports HTTP `Range` requests so video seeking works during dev.

## Scripts

| | |
|---|---|
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Production build (regenerates manifest first) |
| `npm run start` | Serve the production build |
| `npm run manifest` | Regenerate `src/lib/manifest.json` from mirror |
| `npm run upload` | Sync mirror → Linode Object Storage |
| `npm run upload:dry` | Preview the upload plan |
| `npm run lint` | ESLint |

## Production deployment

After uploading assets to Linode and setting `NEXT_PUBLIC_ASSET_BASE_URL`:

```bash
npm run build
npm run start
```

…or deploy to Vercel, Netlify, Cloudflare Pages, or any Node host. All record pages pre-render at build via `generateStaticParams()`, so the entire archive is statically delivered — assets stream from Linode, HTML/JS from your edge.

## License / attribution

The records are U.S. government works (public domain). This site is an unofficial viewer and not affiliated with the Department of War.
