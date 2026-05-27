/**
 * Build a per-file version timeline from the change-log data we have.
 *
 * Inputs:
 *  - ../before-resync/   (originals captured on 2026-05-25)
 *  - ../www.war.gov/...  (live versions captured on 2026-05-27)
 *  - .tmp-need-redownload.txt (the canonical list of URLs that changed)
 *
 * Output:
 *  - src/lib/timeline.json — versioned history per file. Each entry has:
 *      key: canonical path used everywhere else in the site
 *      versions: [{ capturedAt, size, md5, archiveUrl?, liveUrl? }, ...]
 */

import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const ARCHIVE_DATE = "2026-05-25";
const CURRENT_DATE = "2026-05-27";
const OUT = path.resolve(__dirname, "..", "src", "lib", "timeline.json");

interface Version {
  capturedAt: string;
  size: number;
  md5: string;
  /** Where it can be downloaded from (live war.gov for current, archive prefix on Linode for older versions) */
  publicUrl: string;
}

interface TimelineEntry {
  key: string;
  changeKind: "size-larger" | "size-smaller" | "size-similar" | "thumbnail-only";
  versions: Version[];
}

async function md5OfFile(p: string): Promise<string> {
  const buf = await fs.readFile(p);
  return createHash("md5").update(buf).digest("hex");
}

async function fileSize(p: string): Promise<number> {
  return (await fs.stat(p)).size;
}

function urlEncodePath(p: string): string {
  return p.split("/").map((s) => encodeURIComponent(s)).join("/");
}

async function main() {
  // The canonical list of files that changed (URL form)
  const listRaw = await fs.readFile(path.resolve(__dirname, "..", ".tmp-need-redownload.txt"), "utf8");
  const urls = listRaw.split("\n").filter(Boolean);

  // Add the apostrophe-named file that wasn't in the original list
  urls.push("https://www.war.gov/medialink/ufo/release_1/255_413270_ufo's_and_defense_what_should_we_prepare_for.pdf");

  const entries: TimelineEntry[] = [];

  for (const url of urls) {
    const key = url.replace(/^https?:\/\/www\.war\.gov\//, "www.war.gov/");
    const relPath = url.replace(/^https?:\/\/www\.war\.gov\//, "");

    // Live (May 27) file location
    const livePath = path.join(ROOT, "www.war.gov", relPath)
      .replace(/%E2%80%93/g, "–")
      .replace(/%5B/g, "[")
      .replace(/%5D/g, "]")
      .replace(/%20/g, " ")
      .replace(/%27/g, "'");
    // Archive (May 25) file location
    const archivePath = path.join(ROOT, "archive", ARCHIVE_DATE, "www.war.gov", relPath)
      .replace(/%E2%80%93/g, "–")
      .replace(/%5B/g, "[")
      .replace(/%5D/g, "]")
      .replace(/%20/g, " ")
      .replace(/%27/g, "'");

    let oldVer: Version | null = null;
    let newVer: Version | null = null;

    try {
      const size = await fileSize(archivePath);
      const md5 = await md5OfFile(archivePath);
      oldVer = {
        capturedAt: ARCHIVE_DATE,
        size, md5,
        publicUrl: `https://disclosure.us-east-1.linodeobjects.com/archive/${ARCHIVE_DATE}/${urlEncodePath("www.war.gov/" + relPath)}`,
      };
    } catch {}

    try {
      const size = await fileSize(livePath);
      const md5 = await md5OfFile(livePath);
      newVer = {
        capturedAt: CURRENT_DATE,
        size, md5,
        publicUrl: `https://disclosure.us-east-1.linodeobjects.com/${urlEncodePath(key)}`,
      };
    } catch {}

    if (!oldVer && !newVer) continue;

    let changeKind: TimelineEntry["changeKind"] = "size-similar";
    if (oldVer && newVer) {
      const diff = newVer.size - oldVer.size;
      const pct = Math.abs(diff) / oldVer.size;
      if (pct < 0.01) changeKind = "size-similar";
      else if (diff > 0) changeKind = "size-larger";
      else changeKind = "size-smaller";
      if (relPath.includes("/thumbnail") || relPath.endsWith(".jpg")) changeKind = "thumbnail-only";
    }

    entries.push({
      key,
      changeKind,
      versions: [oldVer, newVer].filter(Boolean) as Version[],
    });
  }

  // Aggregate stats
  const totalOldBytes = entries.reduce((s, e) => s + (e.versions.find((v) => v.capturedAt === ARCHIVE_DATE)?.size ?? 0), 0);
  const totalNewBytes = entries.reduce((s, e) => s + (e.versions.find((v) => v.capturedAt === CURRENT_DATE)?.size ?? 0), 0);

  const out = {
    generatedAt: new Date().toISOString(),
    captureDates: [ARCHIVE_DATE, CURRENT_DATE],
    totalFilesChanged: entries.length,
    totalSizeChange: { before: totalOldBytes, after: totalNewBytes, deltaBytes: totalNewBytes - totalOldBytes },
    breakdown: {
      "size-smaller": entries.filter((e) => e.changeKind === "size-smaller").length,
      "size-larger": entries.filter((e) => e.changeKind === "size-larger").length,
      "size-similar": entries.filter((e) => e.changeKind === "size-similar").length,
      "thumbnail-only": entries.filter((e) => e.changeKind === "thumbnail-only").length,
    },
    entries: entries.sort((a, b) => {
      // Largest absolute delta first
      const ad = Math.abs((a.versions[1]?.size ?? 0) - (a.versions[0]?.size ?? 0));
      const bd = Math.abs((b.versions[1]?.size ?? 0) - (b.versions[0]?.size ?? 0));
      return bd - ad;
    }),
  };

  await fs.writeFile(OUT, JSON.stringify(out, null, 2));
  console.log(`Wrote ${OUT}`);
  console.log(`Entries: ${out.totalFilesChanged}`);
  console.log(`Net delta: ${(out.totalSizeChange.deltaBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Breakdown:`, out.breakdown);
}

main().catch((e) => { console.error(e); process.exit(1); });
