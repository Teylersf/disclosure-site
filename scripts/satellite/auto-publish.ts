/**
 * Daily satellite pipeline. Runs all fetchers in sequence, rebuilds the
 * manifest, uploads to Linode, and commits/pushes if anything changed.
 *
 *   npm run sat:publish
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { promises as fs } from "node:fs";
import crypto from "node:crypto";

const SITE_ROOT = path.resolve(__dirname, "..", "..");
const MANIFEST = path.resolve(SITE_ROOT, "src", "lib", "satellite.json");

function run(cmd: string, label: string): boolean {
  console.log(`\n→ ${label}`);
  const r = spawnSync(cmd, { shell: true, cwd: SITE_ROOT, stdio: "inherit" });
  return r.status === 0;
}
function md5(b: Buffer | string): string { return crypto.createHash("md5").update(b).digest("hex"); }
async function fileMd5(p: string): Promise<string | null> { try { return md5(await fs.readFile(p)); } catch { return null; } }

async function main() {
  console.log("=".repeat(70));
  console.log(`sat:publish · ${new Date().toISOString()}`);
  console.log("=".repeat(70));

  const oldHash = await fileMd5(MANIFEST);

  run("npx tsx scripts/satellite/fetch-iotd.ts", "Earth Observatory IOTD");
  run("npx tsx scripts/satellite/fetch-gibs.ts", "GIBS multi-sensor AOI + global");
  run("npx tsx scripts/satellite/fetch-sentinel2.ts", "Sentinel-2 (10m hi-res)");

  if (!run("npx tsx scripts/satellite/build-manifest.ts", "Rebuild satellite manifest")) {
    console.error("✗ manifest build failed"); process.exit(1);
  }

  const newHash = await fileMd5(MANIFEST);
  if (oldHash === newHash) {
    console.log("\n✓ No new satellite data today.");
    process.exit(0);
  }

  console.log("\n→ Upload to Linode");
  const uploaded = spawnSync("npx tsx scripts/satellite/upload.ts", { shell: true, cwd: SITE_ROOT, stdio: "inherit" });
  if (uploaded.status !== 0) console.warn("⚠ upload step had errors; continuing");

  console.log("\n→ Commit + push manifest");
  const add = spawnSync("git add src/lib/satellite.json data/satellite", { shell: true, cwd: SITE_ROOT, stdio: "inherit" });
  if (add.status !== 0) { console.error("✗ git add failed"); process.exit(1); }

  const diffCheck = spawnSync("git diff --cached --quiet", { shell: true, cwd: SITE_ROOT });
  if (diffCheck.status === 0) { console.log("✓ Nothing staged to commit."); process.exit(0); }

  const msgFile = path.join(SITE_ROOT, ".tmp-sat-commit-msg.txt");
  await fs.writeFile(msgFile, `sat: daily refresh\n\nNew or updated satellite captures detected by scripts/satellite/auto-publish.ts at ${new Date().toISOString()}.\n\nCo-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>\n`);
  const commit = spawnSync(`git commit -F "${msgFile}"`, { shell: true, cwd: SITE_ROOT, stdio: "inherit" });
  await fs.unlink(msgFile).catch(() => undefined);
  if (commit.status !== 0) { console.error("✗ git commit failed"); process.exit(1); }

  const push = spawnSync("git push origin main", { shell: true, cwd: SITE_ROOT, stdio: "inherit" });
  if (push.status !== 0) { console.error("✗ git push failed"); process.exit(1); }

  console.log("\n" + "=".repeat(70));
  console.log("✓ Satellite update published. Vercel will rebuild.");
  console.log("=".repeat(70));
}

main().catch((e) => { console.error(e); process.exit(1); });
