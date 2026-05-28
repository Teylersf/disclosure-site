/**
 * Scan disclosure-site/data/whitehouse-uap/<date>/<tweet-id>/meta.json files
 * and emit src/lib/whitehouse-uap.json as a sorted, typed index.
 *
 *   npm run manifest:whitehouse-uap
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data", "whitehouse-uap");
const OUT = path.join(ROOT, "src", "lib", "whitehouse-uap.json");
const ASSET_BASE = (process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "https://disclosure.us-east-1.linodeobjects.com").replace(/\/+$/, "");

interface Media {
  type: "video" | "poster";
  file: string;
  source_url: string;
  size_bytes: number;
  md5: string;
  width?: number;
  height?: number;
  duration_ms?: number;
  codec?: string;
  bitrate_kbps?: number;
  aspect_ratio?: string;
  is_master?: boolean;
}

interface MetaJson {
  tweet_id: string;
  tweet_url: string;
  account: string;
  account_id: string;
  account_verified_type?: string;
  posted_at: string;
  archived_at: string;
  text: string;
  engagement_at_capture: { favorites: number; conversations: number };
  wayback_url: string;
  media: Media[];
  notes?: string[];
}

interface Entry extends MetaJson {
  capture_date: string;
  bucket_prefix: string;
  public_urls: Record<string, string>;
  poster_url: string | null;
  master_video_url: string | null;
  master_video_width: number | null;
  master_video_height: number | null;
  duration_ms: number | null;
}

function listDirs(dir: string): string[] {
  try {
    return readdirSync(dir).filter((n) => statSync(path.join(dir, n)).isDirectory()).sort();
  } catch {
    return [];
  }
}

const entries: Entry[] = [];
for (const captureDate of listDirs(DATA)) {
  const dateDir = path.join(DATA, captureDate);
  for (const tweetId of listDirs(dateDir)) {
    const metaPath = path.join(dateDir, tweetId, "meta.json");
    try {
      const meta = JSON.parse(readFileSync(metaPath, "utf8")) as MetaJson;
      const prefix = `whitehouse-uap/${captureDate}/${tweetId}`;
      const publicUrls: Record<string, string> = {};
      for (const m of meta.media) {
        publicUrls[m.file] = `${ASSET_BASE}/${prefix}/${m.file}`;
      }
      publicUrls["tweet.json"] = `${ASSET_BASE}/${prefix}/tweet.json`;
      publicUrls["meta.json"] = `${ASSET_BASE}/${prefix}/meta.json`;
      const master = meta.media.find((m) => m.is_master)
        ?? meta.media.filter((m) => m.type === "video").sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]
        ?? null;
      const poster = meta.media.find((m) => m.type === "poster") ?? null;
      entries.push({
        ...meta,
        capture_date: captureDate,
        bucket_prefix: prefix,
        public_urls: publicUrls,
        poster_url: poster ? publicUrls[poster.file] : null,
        master_video_url: master ? publicUrls[master.file] : null,
        master_video_width: master?.width ?? null,
        master_video_height: master?.height ?? null,
        duration_ms: master?.duration_ms ?? null,
      });
    } catch (e) {
      console.warn(`Skipping ${metaPath}: ${(e as Error).message}`);
    }
  }
}

// Newest tweets first
entries.sort((a, b) => b.posted_at.localeCompare(a.posted_at));

writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(),
  totalTweets: entries.length,
  accounts: Array.from(new Set(entries.map((e) => e.account))).sort(),
  entries,
}, null, 2));

console.log(`✓ ${entries.length} tweet${entries.length === 1 ? "" : "s"} indexed → ${path.relative(ROOT, OUT)}`);
