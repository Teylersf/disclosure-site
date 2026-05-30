/**
 * Fetch NASA GIBS imagery for each UAP incident AOI + a global daily mosaic.
 *
 * GIBS WMS endpoint:
 *   https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&...
 *
 * Layers we capture per AOI per day:
 *   - VIIRS_NOAA20_CorrectedReflectance_TrueColor   (375m)
 *   - VIIRS_SNPP_CorrectedReflectance_TrueColor     (375m)
 *   - MODIS_Terra_CorrectedReflectance_TrueColor    (250m)
 *   - MODIS_Aqua_CorrectedReflectance_TrueColor     (250m)
 *   - VIIRS_NOAA20_DayNightBand_ENCC                (city lights at night)
 *
 * Each AOI → 5 captures/day (different sensors overpass at different times).
 *
 * For the global mosaic we also pull a downsampled VIIRS_NOAA20 true-color
 * full-disc into data/satellite/gibs-global/<date>/viirs-true-color.jpg
 *
 * Run:
 *   npm run sat:fetch-gibs            (today)
 *   npm run sat:fetch-gibs -- 2026-05-29
 *   npm run sat:fetch-gibs -- last-7   (last 7 days)
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { INCIDENT_AOIS, type IncidentAoi } from "../../src/lib/satellite-aois";

const SITE_ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(SITE_ROOT, "data", "satellite");

const UA = "Mozilla/5.0 (compatible; pursue.report/1.0; +https://pursue.report)";

const GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";

interface Layer {
  id: string;            // local file name
  layer: string;         // GIBS layer identifier
  resolution_m: number;
  source: string;        // human label
}

const AOI_LAYERS: Layer[] = [
  { id: "viirs-noaa20-truecolor.jpg",     layer: "VIIRS_NOAA20_CorrectedReflectance_TrueColor", resolution_m: 375, source: "VIIRS NOAA-20 True Color" },
  { id: "viirs-snpp-truecolor.jpg",       layer: "VIIRS_SNPP_CorrectedReflectance_TrueColor",   resolution_m: 375, source: "VIIRS Suomi NPP True Color" },
  { id: "modis-terra-truecolor.jpg",      layer: "MODIS_Terra_CorrectedReflectance_TrueColor",  resolution_m: 250, source: "MODIS Terra True Color" },
  { id: "modis-aqua-truecolor.jpg",       layer: "MODIS_Aqua_CorrectedReflectance_TrueColor",   resolution_m: 250, source: "MODIS Aqua True Color" },
  { id: "viirs-noaa20-night.jpg",         layer: "VIIRS_NOAA20_DayNightBand_ENCC",              resolution_m: 750, source: "VIIRS NOAA-20 Day/Night Band" },
  { id: "viirs-noaa20-fires.jpg",         layer: "VIIRS_NOAA20_Thermal_Anomalies_375m_Day",     resolution_m: 375, source: "VIIRS NOAA-20 Active Fires" },
  { id: "modis-terra-thermal.jpg",        layer: "MODIS_Terra_Thermal_Anomalies_All",           resolution_m: 1000, source: "MODIS Terra Thermal Anomalies" },
  { id: "modis-aqua-cloudtop-temp.jpg",   layer: "MODIS_Aqua_Cloud_Top_Temp_Day",               resolution_m: 1000, source: "MODIS Aqua Cloud-Top Temperature" },
];

function ymd(d: Date): string { return d.toISOString().slice(0, 10); }

function buildWmsUrl(layer: string, bbox: [number, number, number, number], date: string, width = 1024, height = 1024): string {
  const params = new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.3.0",
    LAYERS: layer,
    STYLES: "",
    FORMAT: "image/jpeg",
    CRS: "EPSG:4326",
    // WMS 1.3.0 EPSG:4326 uses lat,lng order
    BBOX: `${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}`,
    WIDTH: String(width),
    HEIGHT: String(height),
    TIME: date,
  });
  return `${GIBS_WMS}?${params.toString()}`;
}

async function exists(p: string): Promise<boolean> { try { await fs.access(p); return true; } catch { return false; } }

async function fetchLayer(url: string, dest: string): Promise<{ ok: boolean; bytes: number }> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) return { ok: false, bytes: 0 };
    const body = Buffer.from(await r.arrayBuffer());
    // GIBS returns a 4KB-ish all-grey JPEG when the layer has no coverage
    // for the date (e.g. polar night, sensor outage). Treat very-small responses
    // as "no data" so we don't pollute the archive.
    if (body.length < 2000) return { ok: false, bytes: body.length };
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, body);
    return { ok: true, bytes: body.length };
  } catch {
    return { ok: false, bytes: 0 };
  }
}

async function fetchAoiDay(aoi: IncidentAoi, date: string): Promise<{ added: number; skipped: number; failed: number; bytes: number }> {
  let added = 0, skipped = 0, failed = 0, bytes = 0;
  const dayDir = path.join(DATA_DIR, "incidents", aoi.id, date);
  const captures: Array<{ id: string; layer: string; source: string; resolution_m: number; size_bytes: number; bbox: [number, number, number, number] }> = [];

  for (const L of AOI_LAYERS) {
    const dest = path.join(dayDir, L.id);
    if (await exists(dest)) {
      skipped++;
      const sz = (await fs.stat(dest)).size;
      captures.push({ id: L.id, layer: L.layer, source: L.source, resolution_m: L.resolution_m, size_bytes: sz, bbox: aoi.bbox });
      continue;
    }
    const url = buildWmsUrl(L.layer, aoi.bbox, date);
    const r = await fetchLayer(url, dest);
    if (r.ok) {
      added++;
      bytes += r.bytes;
      captures.push({ id: L.id, layer: L.layer, source: L.source, resolution_m: L.resolution_m, size_bytes: r.bytes, bbox: aoi.bbox });
    } else {
      failed++;
    }
  }

  // Write/refresh meta.json for the day
  if (captures.length > 0) {
    const meta = {
      source: "nasa-gibs",
      aoi_id: aoi.id,
      aoi_name: aoi.name,
      lat: aoi.lat, lng: aoi.lng,
      bbox: aoi.bbox,
      date,
      captures,
    };
    await fs.writeFile(path.join(dayDir, "meta.json"), JSON.stringify(meta, null, 2));
  }

  return { added, skipped, failed, bytes };
}

async function fetchGlobalDay(date: string): Promise<{ added: boolean; bytes: number }> {
  const dayDir = path.join(DATA_DIR, "gibs-global", date);
  const dest = path.join(dayDir, "viirs-noaa20-truecolor.jpg");
  if (await exists(dest)) return { added: false, bytes: 0 };
  // Full disc, downsampled: world bbox at 2048x1024
  const url = buildWmsUrl("VIIRS_NOAA20_CorrectedReflectance_TrueColor", [-180, -90, 180, 90], date, 2048, 1024);
  const r = await fetchLayer(url, dest);
  if (r.ok) {
    await fs.writeFile(path.join(dayDir, "meta.json"), JSON.stringify({
      source: "nasa-gibs",
      kind: "global-true-color",
      date,
      layer: "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
      width: 2048, height: 1024,
      size_bytes: r.bytes,
    }, null, 2));
  }
  return { added: r.ok, bytes: r.bytes };
}

function parseDates(arg: string | undefined): string[] {
  if (!arg) return [ymd(new Date(Date.now() - 86400000))]; // yesterday (today often partial)
  if (arg === "last-7") {
    const out: string[] = [];
    for (let i = 1; i <= 7; i++) out.push(ymd(new Date(Date.now() - i * 86400000)));
    return out;
  }
  if (arg === "last-30") {
    const out: string[] = [];
    for (let i = 1; i <= 30; i++) out.push(ymd(new Date(Date.now() - i * 86400000)));
    return out;
  }
  return [arg];
}

async function main() {
  const dateArg = process.argv[2];
  const dates = parseDates(dateArg);
  console.log(`GIBS · ${dates.length} day(s) · ${INCIDENT_AOIS.length} AOIs · ${AOI_LAYERS.length} layers/day`);

  let totalAdded = 0, totalSkipped = 0, totalFailed = 0, totalBytes = 0, globalAdded = 0;

  for (const date of dates) {
    console.log(`\n[${date}]`);

    // 1) Per-AOI captures
    for (const aoi of INCIDENT_AOIS) {
      const r = await fetchAoiDay(aoi, date);
      totalAdded += r.added; totalSkipped += r.skipped; totalFailed += r.failed; totalBytes += r.bytes;
      if (r.added > 0 || r.failed > 0) {
        console.log(`  ${aoi.id.padEnd(22)}  +${r.added} new, ${r.skipped} cached, ${r.failed} no-data`);
      }
    }

    // 2) Global daily mosaic
    const g = await fetchGlobalDay(date);
    if (g.added) {
      globalAdded++;
      totalBytes += g.bytes;
      console.log(`  global               +1 (${(g.bytes / 1024).toFixed(1)} KB)`);
    }
  }

  console.log(`\nGIBS total: ${totalAdded} AOI captures + ${globalAdded} global  ·  ${totalSkipped} cached  ·  ${totalFailed} no-data  ·  ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((e) => { console.error(e); process.exit(1); });
