/**
 * Autonomous war.gov UFO release watcher + publisher.
 *
 * Pipeline:
 *   1. Fetch live uap-data.csv + UFO/ HTML (Chrome-realistic headers).
 *   2. Rebuild the manifest from the new CSV.
 *   3. Diff old vs new: if no record-count or md5 change → no-op, exit 0.
 *   4. On change:
 *       a. Download every new asset URL the new records reference
 *          (PDFs, images, DVIDS JSON metadata, DVIDS CDN videos).
 *       b. Rebuild the manifest again (so it picks up new DVIDS files).
 *       c. Run scripts/upload-linode.ts (archives changed-existing
 *          files to archive/<today>/, uploads new files fresh).
 *       d. git add + commit + push so Vercel auto-deploys.
 *       e. Print a clean summary.
 *
 *   npm run auto-publish
 *
 * Safe to run repeatedly — idempotent. Skips commit if no diff.
 */

import { promises as fs } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import path from "node:path";
import crypto from "node:crypto";
import Papa from "papaparse";

const SCRIPTS_DIR = __dirname;
const SITE_ROOT = path.resolve(__dirname, "..");
const MIRROR_ROOT = path.resolve(__dirname, "..", "..");
const MANIFEST = path.resolve(SITE_ROOT, "src", "lib", "manifest.json");
const DVIDS_DIR = path.join(MIRROR_ROOT, "api.dvidshub.net", "asset");

const CHROME_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Referer": "https://www.war.gov/UFO/",
};

function md5(b: Buffer | string): string { return crypto.createHash("md5").update(b).digest("hex"); }
async function fileMd5(p: string): Promise<string | null> { try { return md5(await fs.readFile(p)); } catch { return null; } }

function run(cmd: string, opts: { cwd?: string; silent?: boolean } = {}): { ok: boolean; out: string } {
  const r = spawnSync(cmd, { shell: true, cwd: opts.cwd ?? SITE_ROOT, encoding: "utf8" });
  const out = (r.stdout ?? "") + (r.stderr ?? "");
  if (!opts.silent) process.stdout.write(out);
  return { ok: r.status === 0, out };
}

async function fetchToFile(url: string, dest: string): Promise<{ ok: boolean; bytes: number; status: number }> {
  try {
    const r = await fetch(url, { headers: CHROME_HEADERS });
    if (!r.ok) return { ok: false, bytes: 0, status: r.status };
    const body = Buffer.from(await r.arrayBuffer());
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, body);
    return { ok: true, bytes: body.length, status: r.status };
  } catch (e) {
    console.error(`  ✗ network error for ${url}: ${(e as Error).message}`);
    return { ok: false, bytes: 0, status: 0 };
  }
}

interface ManifestRecord {
  id: string; type: string; title: string;
  asset?: { url?: string };
  thumbnail?: { url?: string };
  dvids?: { id: string; files?: Array<{ src: string }>; thumbnail?: { url: string }; image?: string };
}

function recordAssetKeys(r: ManifestRecord): string[] {
  const keys = new Set<string>();
  if (r.asset?.url) keys.add(r.asset.url);
  if (r.thumbnail?.url) keys.add(r.thumbnail.url);
  if (r.dvids?.files) for (const f of r.dvids.files) keys.add(f.src);
  if (r.dvids?.thumbnail?.url) keys.add(r.dvids.thumbnail.url);
  if (r.dvids?.image) keys.add(r.dvids.image);
  return Array.from(keys).filter((k) => k && !k.startsWith("http"));
}

function assetKeyToUrl(key: string): string | null {
  // Mirror keys look like: www.war.gov/medialink/ufo/...   or  d34w7g4gy10iej.cloudfront.net/...
  if (!key) return null;
  if (/^[a-z0-9.-]+\.[a-z]{2,}\//.test(key)) return "https://" + key;
  return null;
}

function localPathForKey(key: string): string {
  return path.join(MIRROR_ROOT, ...key.split("/"));
}

async function exists(p: string): Promise<boolean> { try { await fs.access(p); return true; } catch { return false; } }

async function loadManifest(): Promise<{ records: ManifestRecord[]; recordsHash: string } | null> {
  try {
    const raw = await fs.readFile(MANIFEST, "utf8");
    const j = JSON.parse(raw);
    // Hash the records[] only — manifest has a generatedAt timestamp that
    // always changes on rebuild, so md5(raw) would be a false positive.
    const recordsHash = md5(JSON.stringify(j.records));
    return { records: j.records as ManifestRecord[], recordsHash };
  } catch { return null; }
}

async function main() {
  console.log("=".repeat(70));
  console.log(`auto-publish · ${new Date().toISOString()}`);
  console.log("=".repeat(70));

  // 1. Snapshot current state
  const before = await loadManifest();
  if (!before) { console.error("No existing manifest found at " + MANIFEST); process.exit(1); }
  const oldHash = before.recordsHash;
  const oldIds = new Set(before.records.map((r) => r.id));
  console.log(`Baseline: ${before.records.length} records · records hash ${oldHash.slice(0, 12)}…`);

  // 2. Fetch live CSV + HTML
  console.log("\n[1/6] Fetching live war.gov data...");
  const fetched = run("npx tsx scripts/fetch-war-csv.ts");
  if (!fetched.ok) { console.error("✗ Fetch step failed."); process.exit(1); }

  // 3. Rebuild manifest from new CSV
  console.log("\n[2/6] Rebuilding manifest from new CSV...");
  const built1 = run("npx tsx scripts/build-manifest.ts");
  if (!built1.ok) { console.error("✗ Manifest build failed."); process.exit(1); }

  // 4. Diff (records-only hash, ignoring manifest timestamp)
  const after1 = await loadManifest();
  if (!after1) { console.error("Manifest disappeared after rebuild."); process.exit(1); }
  if (oldHash === after1.recordsHash) {
    console.log(`\n✓ No change detected. (${after1.records.length} records, hash unchanged.)`);
    // Discard the spurious timestamp-only manifest rewrite
    run("git checkout src/lib/manifest.json", { silent: true });
    process.exit(0);
  }

  console.log(`\n*** CHANGE DETECTED ***`);
  console.log(`Records: ${before.records.length} → ${after1.records.length}  (delta ${after1.records.length - before.records.length >= 0 ? "+" : ""}${after1.records.length - before.records.length})`);

  // 5. Download new assets referenced by new records
  const newRecords = after1.records.filter((r) => !oldIds.has(r.id));
  console.log(`\n[3/6] Downloading assets for ${newRecords.length} new record(s)...`);

  const toFetch: Array<{ key: string; url: string; dest: string }> = [];
  for (const r of newRecords) {
    // DVIDS JSON metadata: every DVIDS record needs the JSON to be present locally
    if (r.dvids?.id) {
      const jsonPath = path.join(DVIDS_DIR, `video-${r.dvids.id}.json`);
      if (!(await exists(jsonPath))) {
        // DVIDS public API: https://api.dvidshub.net/asset?api_key=...&id=video:NNNN
        // But the existing JSONs in the mirror look like full DVIDS API responses.
        // For now, skip auto-fetching DVIDS JSON — the user would need to provide
        // a DVIDS API key. The CSV/manifest still works for these records.
        console.log(`  ⚠  DVIDS JSON missing for ${r.dvids.id} (skipping, no API key)`);
      }
    }
    for (const k of recordAssetKeys(r)) {
      const url = assetKeyToUrl(k);
      if (!url) continue;
      const dest = localPathForKey(k);
      if (await exists(dest)) continue;
      toFetch.push({ key: k, url, dest });
    }
  }

  console.log(`  ${toFetch.length} asset file(s) to download.`);
  let okCount = 0, failCount = 0, totalBytes = 0;
  for (const t of toFetch) {
    const r = await fetchToFile(t.url, t.dest);
    if (r.ok) {
      okCount++;
      totalBytes += r.bytes;
      console.log(`  ✓ ${(r.bytes / 1024).toFixed(1).padStart(8)} KB  ${t.key}`);
    } else {
      failCount++;
      console.log(`  ✗ HTTP ${r.status}                    ${t.key}`);
    }
  }
  console.log(`  Done. ${okCount} ok, ${failCount} failed, ${(totalBytes / 1024 / 1024).toFixed(2)} MB.`);

  // 6. Rebuild manifest once more (picks up any new DVIDS JSONs that did arrive)
  console.log("\n[4/6] Rebuilding manifest (post-download)...");
  run("npx tsx scripts/build-manifest.ts");

  // 7. Upload to Linode (archives changed-existing automatically)
  console.log("\n[5/6] Uploading to Linode (changed/new files only)...");
  const uploaded = run("npx tsx scripts/upload-linode.ts");
  if (!uploaded.ok) console.warn("⚠ Upload step had errors. Continuing — manifest is still committed.");

  // 8. Commit + push
  console.log("\n[6/6] Committing changes...");
  run("git add src/lib/manifest.json", { silent: true });
  // The other staging targets may not exist in every run — guard each
  run("git add src/lib/whitehouse-uap.json", { silent: true });
  run("git add data", { silent: true });

  const gitDiff = run("git diff --cached --quiet", { silent: true });
  if (gitDiff.ok) {
    console.log("✓ Nothing to commit (no tracked changes).");
    process.exit(0);
  }

  const after = await loadManifest();
  const newCount = after?.records.length ?? 0;
  const delta = newCount - before.records.length;
  const summary = `auto: ${delta >= 0 ? "+" : ""}${delta} record${Math.abs(delta) === 1 ? "" : "s"} on war.gov (${before.records.length} -> ${newCount})`;

  // Write commit message to a temp file to avoid Windows shell escaping pain
  const msgFile = path.join(SITE_ROOT, ".tmp-commit-msg.txt");
  const commitMsg = `${summary}\n\nDetected by scripts/auto-publish.ts at ${new Date().toISOString()}\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>\n`;
  await fs.writeFile(msgFile, commitMsg);
  const committed = run(`git commit -F "${msgFile}"`);
  await fs.unlink(msgFile).catch(() => undefined);
  if (!committed.ok) { console.error("✗ git commit failed"); process.exit(1); }

  console.log("\nPushing to origin...");
  const pushed = run("git push origin main");
  if (!pushed.ok) { console.error("✗ git push failed"); process.exit(1); }

  console.log("\n" + "=".repeat(70));
  console.log(`✓ Published ${delta} change(s). Vercel will rebuild automatically.`);
  console.log("=".repeat(70));
}

main().catch((e) => { console.error(e); process.exit(1); });
