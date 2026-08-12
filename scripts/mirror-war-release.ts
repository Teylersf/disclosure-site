/**
 * Mirror a PURSUE release into the offline archive.
 *
 * This captures the canonical catalog/page, release documents and thumbnails,
 * both official ZIP bundles, the release carousel, the announcement, and the
 * DVIDS metadata plus primary media for every video record.
 *
 * Usage: npx tsx scripts/mirror-war-release.ts
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const MIRROR_ROOT = path.resolve(__dirname, "..", "..");
const RELEASE_DATE = "8/7/26";
const RELEASE_LABEL = "Release 05";
const DVIDS_API_KEY = "key-68bb60d16b35e"; // Public key embedded by war.gov/UFO.

const HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Referer": "https://www.war.gov/UFO/",
};

const HTML_HEADERS = {
  ...HEADERS,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
};

const CATALOG_URL = "https://www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv";
const PAGE_URL = "https://www.war.gov/UFO/";
const ANNOUNCEMENT_URL = "https://www.war.gov/News/Releases/Release/Article/4565994/department-of-war-publishes-fifth-release-of-unidentified-anomalous-phenomena-f/";
const BUNDLE_URLS = [
  "https://www.war.gov/medialink/ufo/release_05/Aug_07/release_05_Aug_07_documents.zip",
  "https://d34w7g4gy10iej.cloudfront.net/release_05/uap_videos_080726.zip",
];

type Download = { url: string; dest: string; headers?: Record<string, string>; label: string };
type DvidsResponse = { results?: { files?: Array<{ src?: string }>; thumbnail?: { url?: string }; image?: string } };

function pathForUrl(raw: string): string {
  const u = new URL(raw);
  return path.join(MIRROR_ROOT, u.host, ...decodeURIComponent(u.pathname).replace(/^\/+/, "").split("/"));
}

async function readIfPresent(file: string): Promise<Buffer | undefined> {
  try { return await fs.readFile(file); } catch { return undefined; }
}

async function download(task: Download): Promise<{ status: "downloaded" | "skipped"; bytes: number }> {
  const existing = await readIfPresent(task.dest);
  const response = await fetch(task.url, { headers: task.headers ?? HEADERS });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const body = Buffer.from(await response.arrayBuffer());
  if (existing && Buffer.compare(existing, body) === 0) return { status: "skipped", bytes: body.length };
  await fs.mkdir(path.dirname(task.dest), { recursive: true });
  await fs.writeFile(task.dest, body);
  return { status: "downloaded", bytes: body.length };
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>, concurrency = 6): Promise<void> {
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

async function main() {
  console.log(`${RELEASE_LABEL} mirror — ${RELEASE_DATE}`);

  const catalogDest = pathForUrl(CATALOG_URL);
  const pageDest = path.join(MIRROR_ROOT, "www.war.gov", "UFO", "index.html");
  await download({ url: CATALOG_URL, dest: catalogDest, label: "canonical catalog" });
  await download({ url: PAGE_URL, dest: pageDest, headers: HTML_HEADERS, label: "canonical page" });
  await download({ url: ANNOUNCEMENT_URL, dest: path.join(MIRROR_ROOT, "www.war.gov", "News", "Releases", "Release", "Article", "4565994", "index.html"), headers: HTML_HEADERS, label: "announcement" });

  const csv = await fs.readFile(catalogDest, "utf8");
  const rows = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true }).data
    .filter((row) => row["Release Date"]?.trim() === RELEASE_DATE);
  if (rows.length !== 41) throw new Error(`Expected 41 ${RELEASE_LABEL} records; found ${rows.length}.`);

  const releaseAssets = new Map<string, Download>();
  for (const row of rows) {
    for (const [field, kind] of [["PDF | Image Link", "asset"], ["Modal Image", "thumbnail"]] as const) {
      const url = row[field]?.trim();
      if (!url) continue;
      releaseAssets.set(url, { url, dest: pathForUrl(url), label: `${kind}: ${row.Title}` });
    }
  }
  for (const url of BUNDLE_URLS) releaseAssets.set(url, { url, dest: pathForUrl(url), label: "official ZIP" });

  const pageHtml = await fs.readFile(pageDest, "utf8");
  for (const match of pageHtml.matchAll(/(?:https:\/\/www\.war\.gov)?(\/portals\/1\/Interactive\/2026\/UFO\/080726\/Slideshow\/[^"'\s<]+)/gi)) {
    const url = new URL(match[1], "https://www.war.gov").toString();
    releaseAssets.set(url, { url, dest: pathForUrl(url), label: "release carousel" });
  }

  const dvidsIds = rows.map((row) => row["DVIDS Video ID"]?.trim()).filter((id): id is string => Boolean(id));
  if (dvidsIds.length !== 16) throw new Error(`Expected 16 DVIDS records; found ${dvidsIds.length}.`);

  const dvidsAssets = new Map<string, Download>();
  for (const id of dvidsIds) {
    const url = `https://api.dvidshub.net/asset?api_key=${DVIDS_API_KEY}&id=video:${id}&thumb_width=720`;
    const dest = path.join(MIRROR_ROOT, "api.dvidshub.net", "asset", `video-${id}.json`);
    await download({ url, dest, label: `DVIDS metadata ${id}` });
    const data = JSON.parse(await fs.readFile(dest, "utf8")) as DvidsResponse;
    const mediaUrls = [data.results?.files?.[0]?.src, data.results?.thumbnail?.url, data.results?.image]
      .filter((value): value is string => Boolean(value));
    if (mediaUrls.length < 2) throw new Error(`DVIDS ${id} did not expose its primary media and thumbnail.`);
    for (const mediaUrl of mediaUrls) {
      dvidsAssets.set(mediaUrl, { url: mediaUrl, dest: pathForUrl(mediaUrl), label: `DVIDS media ${id}` });
    }
  }

  const tasks = [...releaseAssets.values(), ...dvidsAssets.values()];
  let downloaded = 0;
  let skipped = 0;
  let bytes = 0;
  await runPool(tasks, async (task) => {
    const result = await download(task);
    if (result.status === "downloaded") downloaded++;
    else skipped++;
    bytes += result.bytes;
    console.log(`  ${result.status === "downloaded" ? "✓" : "="} ${(result.bytes / 1024 / 1024).toFixed(2).padStart(8)} MB  ${task.label}`);
  });

  console.log(`Complete: ${rows.length} records; ${dvidsIds.length} DVIDS records; ${downloaded} downloaded, ${skipped} unchanged; ${(bytes / 1024 / 1024).toFixed(1)} MB verified.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
