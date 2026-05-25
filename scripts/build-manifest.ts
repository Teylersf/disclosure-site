import { promises as fs } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import type { Manifest, UapRecord, RecordType, DvidsMeta } from "../src/lib/types";

const MIRROR_ROOT = path.resolve(__dirname, "..", "..");
const CSV_PATH = path.join(
  MIRROR_ROOT,
  "www.war.gov",
  "Portals",
  "1",
  "Interactive",
  "2026",
  "UFO",
  "uap-data.csv",
);
const DVIDS_DIR = path.join(MIRROR_ROOT, "api.dvidshub.net", "asset");
const OUT_FILE = path.resolve(__dirname, "..", "src", "lib", "manifest.json");

// Normalize a CSV-stored URL to a portable asset path.
// CSV entries look like ../medialink/ufo/release_1/foo.pdf (relative to www.war.gov/UFO/).
// DVIDS JSON entries look like ../../d34w7g4gy10iej.cloudfront.net/... (relative to the same).
// We want a single "asset key" that resolves under the mirror root.
function csvUrlToKey(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("../../")) return trimmed.slice(6); // host/path
  if (trimmed.startsWith("../")) return `www.war.gov/${trimmed.slice(3)}`;
  if (/^https?:\/\//.test(trimmed)) {
    const u = new URL(trimmed);
    return `${u.host}${u.pathname}`;
  }
  return trimmed;
}

function classifyType(raw: string): RecordType {
  const t = raw.trim().toUpperCase();
  if (t.startsWith("V")) return "VID";
  if (t.startsWith("A")) return "AUD";
  if (t.startsWith("I")) return "IMG";
  return "PDF";
}

function makeId(record: { title: string; type: RecordType; dvidsId?: string; asset?: { url: string } }, idx: number): string {
  if (record.dvidsId) return `dvids-${record.dvidsId}`;
  const base = record.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return base ? `${record.type.toLowerCase()}-${base}` : `${record.type.toLowerCase()}-${idx}`;
}

async function loadDvidsMeta(dvidsId: string): Promise<DvidsMeta | undefined> {
  const file = path.join(DVIDS_DIR, `video-${dvidsId}.json`);
  try {
    let text = await fs.readFile(file, "utf8");
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
    const json = JSON.parse(text);
    const r = json.results;
    if (!r) return undefined;
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      date_published: r.date_published,
      date: r.date,
      duration: r.duration,
      files: (r.files ?? []).map((f: { src: string; width: number; height: number; size: number; bitrate?: number; type: string }) => ({
        src: f.src.replace(/^\.\.\/\.\.\//, ""),
        width: f.width,
        height: f.height,
        size: f.size,
        bitrate: f.bitrate,
        type: f.type,
      })),
      thumbnail: r.thumbnail
        ? { url: String(r.thumbnail.url).replace(/^\.\.\/\.\.\//, ""), width: r.thumbnail.width, height: r.thumbnail.height }
        : undefined,
      image: r.image ? String(r.image).replace(/^\.\.\/\.\.\//, "") : undefined,
      hls_url: r.hls_url,
      closed_captions: r.closed_caption_urls
        ? { srt: r.closed_caption_urls.srt, webvtt: r.closed_caption_urls.webvtt }
        : undefined,
    };
  } catch {
    return undefined;
  }
}

async function main() {
  // On Vercel/CI there's no parent mirror folder — the committed manifest is
  // the source of truth. Skip cleanly so the build doesn't fail.
  try {
    await fs.access(CSV_PATH);
  } catch {
    try {
      const existing = await fs.readFile(OUT_FILE, "utf8");
      const j = JSON.parse(existing);
      console.log(`Source CSV not found at ${CSV_PATH} — using committed manifest (${j.totalCount ?? "?"} records).`);
      return;
    } catch {
      console.error(`Source CSV not found at ${CSV_PATH} and no committed manifest at ${OUT_FILE}.`);
      console.error("Run \`npm run manifest\` locally with the mirror present, then commit src/lib/manifest.json.");
      process.exit(1);
    }
  }

  const csvText = await fs.readFile(CSV_PATH, "utf8");
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length) {
    console.warn(`CSV parse warnings: ${parsed.errors.length}`);
  }

  const records: UapRecord[] = [];
  let idx = 0;
  const usedIds = new Set<string>();

  for (const row of parsed.data) {
    const title = (row["Title"] ?? "").trim();
    if (!title) continue;
    const type = classifyType(row["Type"] ?? "");
    const releaseDate = (row["Release Date"] ?? "").trim();
    const release = releaseDate === "5/22/26" ? "release_2" : "release_1";
    const dvidsId = (row["DVIDS Video ID"] ?? "").trim() || undefined;
    const assetKey = csvUrlToKey(row["PDF | Image Link"]);
    const thumbKey = csvUrlToKey(row["Modal Image"]);

    const partial = { title, type, dvidsId, asset: assetKey ? { url: assetKey } : undefined };
    let id = makeId(partial, idx);
    let suffix = 1;
    while (usedIds.has(id)) id = `${makeId(partial, idx)}-${suffix++}`;
    usedIds.add(id);

    const dvids = dvidsId ? await loadDvidsMeta(dvidsId) : undefined;

    let assetUrl = assetKey;
    let thumbUrl = thumbKey;
    if (!assetUrl && dvids?.files?.[0]) assetUrl = dvids.files[0].src;
    if (!thumbUrl && dvids?.thumbnail) thumbUrl = dvids.thumbnail.url;
    if (!thumbUrl && dvids?.image) thumbUrl = dvids.image;

    const rec: UapRecord = {
      id,
      type,
      title,
      agency: (row["Agency"] ?? "").trim(),
      description: (row["Description Blurb"] ?? "").trim(),
      incidentDate: (row["Incident Date"] ?? "").trim(),
      incidentLocation: (row["Incident Location"] ?? "").trim(),
      releaseDate,
      release,
      redacted: (row["Redaction"] ?? "").trim().toUpperCase() === "TRUE",
      imageAlt: (row["Image Alt Text"] ?? "").trim() || undefined,
      imageVirin: (row["Image VIRIN"] ?? "").trim() || undefined,
      asset: assetUrl ? { url: assetUrl } : undefined,
      thumbnail: thumbUrl ? { url: thumbUrl } : undefined,
      dvidsId,
      dvids,
    };
    records.push(rec);
    idx++;
  }

  // Aggregate stats
  const byType: Record<RecordType, number> = { PDF: 0, VID: 0, IMG: 0, AUD: 0 };
  const byRelease: Record<string, number> = {};
  const byAgency: Record<string, number> = {};
  for (const r of records) {
    byType[r.type]++;
    byRelease[r.releaseDate] = (byRelease[r.releaseDate] ?? 0) + 1;
    if (r.agency) byAgency[r.agency] = (byAgency[r.agency] ?? 0) + 1;
  }

  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    totalCount: records.length,
    byType,
    byRelease,
    byAgency,
    agencies: Object.keys(byAgency).sort(),
    releases: Object.keys(byRelease).sort(),
    records,
  };

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(manifest, null, 2));

  console.log(`Wrote ${OUT_FILE}`);
  console.log(`Records: ${manifest.totalCount}`);
  console.log(`By type: ${JSON.stringify(byType)}`);
  console.log(`By release: ${JSON.stringify(byRelease)}`);
  console.log(`Agencies: ${manifest.agencies.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
