/**
 * Pull the live uap-data.csv and the war.gov/UFO/ HTML page snapshot.
 * Saves into the same local mirror tree that build-manifest.ts reads from.
 *
 * Akamai blocks bare curl; this script sends the full Chrome 131
 * client-hints header set that consistently gets through.
 *
 *   npm run fetch:war-csv
 *
 * Files written:
 *   ../www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv
 *   ../www.war.gov/UFO/index.html
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const MIRROR_ROOT = path.resolve(__dirname, "..", "..");

const HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "Cache-Control": "no-cache",
};

async function fetchAndSave(url: string, dest: string, kind: "html" | "csv"): Promise<{ bytes: number; status: number }> {
  const headers = { ...HEADERS };
  if (kind === "csv") {
    headers["Accept"] = "*/*";
    headers["Referer"] = "https://www.war.gov/UFO/";
    headers["Sec-Fetch-Dest"] = "empty";
    headers["Sec-Fetch-Mode"] = "cors";
    headers["Sec-Fetch-Site"] = "same-origin";
  }
  const r = await fetch(url, { headers });
  if (!r.ok) {
    console.error(`✗ ${r.status} ${r.statusText} for ${url}`);
    return { bytes: 0, status: r.status };
  }
  const body = Buffer.from(await r.arrayBuffer());
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, body);
  return { bytes: body.length, status: r.status };
}

const TARGETS = [
  {
    url: "https://www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv",
    dest: path.join(MIRROR_ROOT, "www.war.gov", "Portals", "1", "Interactive", "2026", "UFO", "uap-data.csv"),
    kind: "csv" as const,
  },
  {
    url: "https://www.war.gov/UFO/",
    dest: path.join(MIRROR_ROOT, "www.war.gov", "UFO", "index.html"),
    kind: "html" as const,
  },
];

async function main() {
  for (const t of TARGETS) {
    const r = await fetchAndSave(t.url, t.dest, t.kind);
    if (r.status === 200) {
      console.log(`✓ ${(r.bytes / 1024).toFixed(1).padStart(7)} KB  ${path.relative(MIRROR_ROOT, t.dest)}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
