/**
 * Aggregate everything in data/satellite/** into src/lib/satellite.json.
 *
 *   npm run sat:manifest
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { INCIDENT_AOIS } from "../../src/lib/satellite-aois";

const ROOT = path.resolve(__dirname, "..", "..");
const DATA = path.join(ROOT, "data", "satellite");
const OUT = path.join(ROOT, "src", "lib", "satellite.json");
const ASSET_BASE = (process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "https://disclosure.us-east-1.linodeobjects.com").replace(/\/+$/, "");

function listDirs(dir: string): string[] {
  try { return readdirSync(dir).filter((n) => statSync(path.join(dir, n)).isDirectory()).sort(); } catch { return []; }
}
function listFiles(dir: string): string[] {
  try { return readdirSync(dir).filter((n) => statSync(path.join(dir, n)).isFile()).sort(); } catch { return []; }
}
function readJson(p: string): unknown | null {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

interface IotdEntry {
  date: string;
  title: string;
  link: string;
  description: string;
  image_url: string;
  size_bytes: number;
}

interface IncidentCapture {
  source: string;          // "VIIRS NOAA-20 True Color"
  layer?: string;          // GIBS layer id
  file: string;            // local filename
  url: string;             // public URL
  size_bytes: number;
  resolution_m?: number;
  datetime_utc?: string;
  cloud_cover_percent?: number;
  platform?: string;
}

interface IncidentDayBundle {
  aoi_id: string;
  date: string;
  captures: IncidentCapture[];
}

const out = {
  generatedAt: new Date().toISOString(),
  aois: INCIDENT_AOIS,
  iotd: [] as IotdEntry[],
  global: [] as Array<{ date: string; url: string; size_bytes: number }>,
  incidentDays: [] as IncidentDayBundle[],
};

// --- IOTD ---
const iotdDir = path.join(DATA, "iotd");
for (const date of listDirs(iotdDir).reverse()) {
  const meta = readJson(path.join(iotdDir, date, "meta.json")) as null | {
    title: string; link: string; description: string;
    image: { file: string; source_url: string; size_bytes: number };
  };
  if (!meta) continue;
  out.iotd.push({
    date,
    title: meta.title,
    link: meta.link,
    description: meta.description,
    image_url: `${ASSET_BASE}/satellite/iotd/${date}/${meta.image.file}`,
    size_bytes: meta.image.size_bytes,
  });
}

// --- Global GIBS mosaics ---
const globalDir = path.join(DATA, "gibs-global");
for (const date of listDirs(globalDir).reverse()) {
  const meta = readJson(path.join(globalDir, date, "meta.json")) as null | { size_bytes: number };
  if (!meta) continue;
  out.global.push({
    date,
    url: `${ASSET_BASE}/satellite/gibs-global/${date}/viirs-noaa20-truecolor.jpg`,
    size_bytes: meta.size_bytes,
  });
}

// --- Per-incident per-day bundles ---
const incidentsDir = path.join(DATA, "incidents");
for (const aoiId of listDirs(incidentsDir)) {
  const aoiDir = path.join(incidentsDir, aoiId);
  for (const date of listDirs(aoiDir).reverse()) {
    const dayDir = path.join(aoiDir, date);
    const captures: IncidentCapture[] = [];

    // GIBS captures (from meta.json)
    const gibsMeta = readJson(path.join(dayDir, "meta.json")) as null | {
      captures: Array<{ id: string; layer: string; source: string; resolution_m: number; size_bytes: number }>;
    };
    if (gibsMeta?.captures) {
      for (const c of gibsMeta.captures) {
        captures.push({
          source: c.source,
          layer: c.layer,
          file: c.id,
          url: `${ASSET_BASE}/satellite/incidents/${aoiId}/${date}/${c.id}`,
          size_bytes: c.size_bytes,
          resolution_m: c.resolution_m,
        });
      }
    }

    // Sentinel-2 (from meta-sentinel2.json)
    const s2Meta = readJson(path.join(dayDir, "meta-sentinel2.json")) as null | {
      datetime_utc: string; cloud_cover_percent: number; platform: string;
      assets: { preview: { file: string; size_bytes: number }; visual_cog_url?: string };
    };
    if (s2Meta) {
      captures.push({
        source: `Sentinel-2 (${s2Meta.platform ?? "L2A"})`,
        file: s2Meta.assets.preview.file,
        url: `${ASSET_BASE}/satellite/incidents/${aoiId}/${date}/${s2Meta.assets.preview.file}`,
        size_bytes: s2Meta.assets.preview.size_bytes,
        resolution_m: 10,
        datetime_utc: s2Meta.datetime_utc,
        cloud_cover_percent: s2Meta.cloud_cover_percent,
        platform: s2Meta.platform,
      });
      // Also surface the rendered preview if it exists
      const renderedPath = path.join(dayDir, "sentinel2-rendered.jpg");
      const rendered = listFiles(dayDir).find((f) => f === "sentinel2-rendered.jpg");
      if (rendered) {
        try {
          const sz = statSync(renderedPath).size;
          captures.push({
            source: `Sentinel-2 rendered preview`,
            file: "sentinel2-rendered.jpg",
            url: `${ASSET_BASE}/satellite/incidents/${aoiId}/${date}/sentinel2-rendered.jpg`,
            size_bytes: sz,
            resolution_m: 10,
            datetime_utc: s2Meta.datetime_utc,
            platform: s2Meta.platform,
          });
        } catch {}
      }
    }

    if (captures.length > 0) {
      out.incidentDays.push({ aoi_id: aoiId, date, captures });
    }
  }
}

writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`✓ satellite manifest written → ${path.relative(ROOT, OUT)}`);
console.log(`   ${out.iotd.length} IOTD · ${out.global.length} global · ${out.incidentDays.length} incident-days`);
