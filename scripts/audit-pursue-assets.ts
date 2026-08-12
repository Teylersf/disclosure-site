/**
 * Compare a captured PURSUE catalog to its live asset URLs without modifying
 * the working mirror. This is the silent-republish guard used after a drop.
 *
 * Usage:
 *   npx tsx scripts/audit-pursue-assets.ts --csv ../archive/2026-08-06/www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv --report ../archive/2026-08-07/pre-r5-integrity-scan.json
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const MIRROR_ROOT = path.resolve(__dirname, "..", "..");
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

type Candidate = { url: string; localPath: string; source: string };
type Result = Candidate & { status: number; localBytes?: number; remoteBytes?: number; match: boolean; error?: string };

function option(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) throw new Error(`Missing ${name} value.`);
  return value;
}

function toUrl(raw: string): string {
  const value = raw.trim();
  // DVIDS JSON uses ../../<host>/<path> to point out of war.gov/UFO/.
  if (value.startsWith("../../")) return `https://${value.slice(6)}`;
  return new URL(value, "https://www.war.gov/UFO/").toString();
}

function localPathForUrl(raw: string): string {
  const url = new URL(toUrl(raw));
  return path.join(MIRROR_ROOT, url.host, ...decodeURIComponent(url.pathname).replace(/^\/+/, "").split("/"));
}

async function addCandidate(candidates: Map<string, Candidate>, raw: string | undefined, source: string): Promise<void> {
  if (!raw?.trim()) return;
  const url = toUrl(raw.trim());
  candidates.set(url, { url, localPath: localPathForUrl(url), source });
}

async function audit(candidate: Candidate): Promise<Result> {
  let localBytes: number | undefined;
  try { localBytes = (await fs.stat(candidate.localPath)).size; }
  catch { return { ...candidate, status: 0, match: false, error: "missing local mirror file" }; }

  try {
    const response = await fetch(candidate.url, { method: "HEAD", headers: HEADERS, redirect: "follow" });
    const rawLength = response.headers.get("content-length");
    const remoteBytes = rawLength ? Number(rawLength) : undefined;
    return {
      ...candidate,
      status: response.status,
      localBytes,
      remoteBytes,
      match: response.ok && remoteBytes !== undefined && localBytes === remoteBytes,
      error: response.ok && remoteBytes === undefined ? "no content-length" : undefined,
    };
  } catch (error) {
    return { ...candidate, status: 0, localBytes, match: false, error: (error as Error).message };
  }
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>, concurrency = 10): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      await worker(items[index]);
    }
  }));
}

async function main() {
  const csvPath = path.resolve(option("--csv"));
  const reportPath = path.resolve(option("--report"));
  const csv = await fs.readFile(csvPath, "utf8");
  const rows = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true }).data;
  const candidates = new Map<string, Candidate>();

  for (const row of rows) {
    await addCandidate(candidates, row["PDF | Image Link"], `${row.Title} asset`);
    await addCandidate(candidates, row["Modal Image"], `${row.Title} thumbnail`);
    const id = row["DVIDS Video ID"]?.trim();
    if (!id) continue;
    try {
      let text = await fs.readFile(path.join(MIRROR_ROOT, "api.dvidshub.net", "asset", `video-${id}.json`), "utf8");
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      const metadata = JSON.parse(text);
      // The original MP4 is a stable source object. DVIDS' preview and
      // thumbnail URLs are on-the-fly image transforms; their byte sizes can
      // legitimately change when the CDN's image encoder changes, so they are
      // not evidence of a source-file republish.
      await addCandidate(candidates, metadata.results?.files?.[0]?.src, `DVIDS ${id} primary media`);
    } catch {
      candidates.set(`missing-dvids-${id}`, { url: `missing-dvids-${id}`, localPath: "", source: `${row.Title} DVIDS metadata` });
    }
  }

  const results: Result[] = [];
  const list = [...candidates.values()];
  await runPool(list, async (candidate) => {
    results.push(await audit(candidate));
  });
  results.sort((a, b) => a.url.localeCompare(b.url));

  const unchanged = results.filter((r) => r.match);
  const changed = results.filter((r) => r.status === 200 && r.remoteBytes !== undefined && r.localBytes !== r.remoteBytes);
  const unresolved = results.filter((r) => !r.match && !changed.includes(r));
  const report = {
    capturedAt: new Date().toISOString(),
    catalog: csvPath,
    totals: { rows: rows.length, assets: results.length, unchanged: unchanged.length, changed: changed.length, unresolved: unresolved.length },
    changed,
    unresolved,
    results,
  };
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`Audited ${results.length} assets from ${rows.length} records.`);
  console.log(`Unchanged: ${unchanged.length}; changed: ${changed.length}; unresolved: ${unresolved.length}.`);
  console.log(`Report: ${reportPath}`);
  if (changed.length || unresolved.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
