/**
 * Fetch Sentinel-2 imagery for each UAP-incident AOI via the public Earth-Search
 * STAC API (s3://sentinel-cogs hosted by element84.com — free, no auth, 10m).
 *
 *   STAC: https://earth-search.aws.element84.com/v1/
 *   Collection: sentinel-2-l2a
 *
 * Sentinel-2 has ~5-day revisit, so we don't capture every day — we capture the
 * MOST RECENT scene for each AOI that has <30% cloud cover and store its
 * preview/thumbnail (the visual.tif is huge — we keep the thumb for the gallery
 * and link the COG for users who want full res).
 *
 * Run:
 *   npm run sat:fetch-sentinel2
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { INCIDENT_AOIS, type IncidentAoi } from "../../src/lib/satellite-aois";

const SITE_ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(SITE_ROOT, "data", "satellite", "incidents");

const STAC = "https://earth-search.aws.element84.com/v1/search";
const UA = "Mozilla/5.0 (compatible; pursue.report/1.0; +https://pursue.report)";

interface StacFeature {
  id: string;
  bbox: number[];
  properties: {
    datetime: string;
    "eo:cloud_cover"?: number;
    "s2:granule_id"?: string;
    platform?: string;
    constellation?: string;
  };
  assets: Record<string, { href: string; type?: string; title?: string }>;
}

async function exists(p: string): Promise<boolean> { try { await fs.access(p); return true; } catch { return false; } }

function ymd(d: Date | string): string {
  const dd = typeof d === "string" ? new Date(d) : d;
  return dd.toISOString().slice(0, 10);
}

async function searchAoi(aoi: IncidentAoi, daysBack = 30): Promise<StacFeature[]> {
  const end = new Date();
  const start = new Date(Date.now() - daysBack * 86400000);
  const body = {
    collections: ["sentinel-2-l2a"],
    bbox: aoi.bbox,
    datetime: `${start.toISOString()}/${end.toISOString()}`,
    limit: 10,
    sortby: [{ field: "properties.datetime", direction: "desc" }],
    query: { "eo:cloud_cover": { lt: 30 } },
  };
  const r = await fetch(STAC, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    console.warn(`  ⚠ STAC HTTP ${r.status} for ${aoi.id}`);
    return [];
  }
  const j = await r.json() as { features: StacFeature[] };
  return j.features ?? [];
}

async function fetchAsset(url: string, dest: string): Promise<{ ok: boolean; bytes: number }> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) return { ok: false, bytes: 0 };
    const body = Buffer.from(await r.arrayBuffer());
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, body);
    return { ok: true, bytes: body.length };
  } catch {
    return { ok: false, bytes: 0 };
  }
}

async function main() {
  console.log(`Sentinel-2 · checking ${INCIDENT_AOIS.length} AOIs for recent scenes (≤30% cloud, last 30 days)`);

  let totalScenes = 0, totalSkipped = 0, totalBytes = 0;

  for (const aoi of INCIDENT_AOIS) {
    const features = await searchAoi(aoi);
    if (features.length === 0) {
      console.log(`  ${aoi.id.padEnd(22)} no scenes`);
      continue;
    }

    // Take the most recent feature
    const top = features[0];
    const date = ymd(top.properties.datetime);
    const dayDir = path.join(DATA_DIR, aoi.id, date);
    const thumbPath = path.join(dayDir, "sentinel2-preview.jpg");

    if (await exists(thumbPath)) {
      totalSkipped++;
      console.log(`  ${aoi.id.padEnd(22)} ${date} cached`);
      continue;
    }

    // Preferred asset order: thumbnail (small jpeg), then "rendered_preview",
    // then "visual" full-res COG (32 MB+).
    const thumbAsset = top.assets["thumbnail"] ?? top.assets["preview"];
    const renderedAsset = top.assets["rendered_preview"];
    const visualAsset = top.assets["visual"];

    let added = false;
    let bytes = 0;
    if (thumbAsset) {
      const r = await fetchAsset(thumbAsset.href, thumbPath);
      if (r.ok) { added = true; bytes = r.bytes; }
    }
    if (!added && renderedAsset) {
      const r = await fetchAsset(renderedAsset.href, thumbPath);
      if (r.ok) { added = true; bytes = r.bytes; }
    }

    if (added) {
      // Also save the rendered_preview at higher res if available
      if (renderedAsset) {
        await fetchAsset(renderedAsset.href, path.join(dayDir, "sentinel2-rendered.jpg"));
      }
      const cloudCover = top.properties["eo:cloud_cover"];
      const meta = {
        source: "sentinel-2-l2a",
        aoi_id: aoi.id,
        aoi_name: aoi.name,
        date,
        datetime_utc: top.properties.datetime,
        stac_id: top.id,
        cloud_cover_percent: cloudCover,
        platform: top.properties.platform,
        bbox: top.bbox,
        assets: {
          preview: { file: "sentinel2-preview.jpg", source_url: thumbAsset?.href ?? renderedAsset?.href ?? "", size_bytes: bytes },
          visual_cog_url: visualAsset?.href,
        },
      };
      await fs.writeFile(path.join(dayDir, "meta-sentinel2.json"), JSON.stringify(meta, null, 2));
      totalScenes++;
      totalBytes += bytes;
      console.log(`  ${aoi.id.padEnd(22)} ${date}  ${(bytes / 1024).toFixed(1).padStart(7)} KB  cloud ${cloudCover?.toFixed(1) ?? "?"}%`);
    } else {
      console.log(`  ${aoi.id.padEnd(22)} ${date} ✗ asset fetch failed`);
    }
  }

  console.log(`\nSentinel-2: ${totalScenes} new, ${totalSkipped} cached, ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((e) => { console.error(e); process.exit(1); });
