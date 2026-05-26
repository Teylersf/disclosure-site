// Recursive mirror for https://tothemoon.im-ldi.com/
//
// Usage (from disclosure-site/):
//   node scripts/mirror-tothemoon.mjs
//
// Saves into ../tothemoon.im-ldi.com/ (sibling to existing www.war.gov mirror).
// Resumable: skips files already present.

import { promises as fs } from "node:fs";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";

const ROOT_URL = "https://tothemoon.im-ldi.com";
const HOSTNAME = "tothemoon.im-ldi.com";
const OUT_ROOT = path.resolve(import.meta.dirname, "..", "..", "tothemoon.im-ldi.com");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const DELAY_MS = 250;
const MAX_CONCURRENCY = 4;

const visited = new Set();
const queue = [];
const assets = new Set();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Decode the handful of HTML entities that show up inside href/src attributes.
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/g, "'");
}

/**
 * Convert a URL to a local file path that's always a leaf node (file, not dir).
 *
 * Rules:
 *  - URLs without a file extension (e.g. /about, /gallery/Mercury) become
 *    /path/index.html so they can coexist with deeper routes like
 *    /about/mercury_history (which also becomes its own folder/index.html).
 *  - URLs with query strings get the query baked into the filename so
 *    /download_document?file_name=foo.pdf&project=MERCURY doesn't collide
 *    with other ?file_name= URLs.
 *  - Windows-illegal chars are stripped.
 */
function urlToLocalPath(u) {
  const url = new URL(u);
  let p = decodeURIComponent(url.pathname);

  const lastSeg = p.split("/").pop() || "";
  const hasExt = /\.[a-z0-9]{1,6}$/i.test(lastSeg);

  // Extension-less route → treat as directory + index.html
  if (!hasExt) {
    if (p.endsWith("/")) p = p.slice(0, -1);
    p += "/index.html";
  }

  // Query string → distinguish files. Prefer human-readable params, fall back to hash.
  if (url.search) {
    const params = url.searchParams;
    const friendly =
      params.get("file_name") ||
      params.get("video_name") ||
      params.get("name") ||
      null;
    const project = params.get("project") || "";
    if (friendly) {
      // /download_document?file_name=foo.pdf&project=MERCURY  →
      // /download_document/MERCURY/foo.pdf
      const dir = path.posix.dirname(p);
      const base = path.posix.basename(p, path.posix.extname(p)); // strip .html if appended
      p = path.posix.join(dir, base, project, friendly);
    } else {
      const hash = createHash("sha1").update(url.search).digest("hex").slice(0, 10);
      p = p.replace(/(\.[a-z0-9]{1,6})?$/i, (m) => `-${hash}${m || ""}`);
    }
  }

  // Sanitize for Windows file system
  p = p.replace(/[<>:"|?*]/g, "_");
  return path.join(OUT_ROOT, p);
}

function isSameSite(u) {
  try { return new URL(u).hostname === HOSTNAME; } catch { return false; }
}

// Should we crawl this URL looking for more links? (HTML-y routes.)
// We still always FETCH it; this just determines whether we parse the response.
function shouldCrawlAsHtml(u) {
  const url = new URL(u);
  // download_* endpoints return binary files, don't crawl as HTML
  if (/^\/(download_|assets?\/)/.test(url.pathname)) return false;
  const ext = path.extname(url.pathname).toLowerCase();
  return !ext || /^\.(html?|aspx|php)$/.test(ext);
}

function extractLinks(html, baseUrl) {
  const links = new Set();
  const reAttr = /(?:href|src|data-src|action)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = reAttr.exec(html))) {
    const raw = decodeEntities(m[1].trim());
    if (!raw || raw.startsWith("#") || raw.startsWith("javascript:") || raw.startsWith("mailto:") || raw.startsWith("data:") || raw.startsWith("tel:")) continue;
    try {
      const abs = new URL(raw, baseUrl).toString().split("#")[0];
      links.add(abs);
    } catch {}
  }
  // CSS url(...) and inline style background-image
  const reBg = /url\(\s*["']?([^)"']+)["']?\s*\)/gi;
  while ((m = reBg.exec(html))) {
    try { links.add(new URL(decodeEntities(m[1].trim()), baseUrl).toString().split("#")[0]); } catch {}
  }
  return links;
}

async function fileExists(p) {
  try { const s = await fs.stat(p); return s.isFile() && s.size > 0; } catch { return false; }
}

async function downloadOne(u) {
  const local = urlToLocalPath(u);
  if (await fileExists(local)) return { url: u, status: "skip", path: local };

  await fs.mkdir(path.dirname(local), { recursive: true });

  let resp;
  try {
    resp = await fetch(u, {
      headers: { "User-Agent": UA, "Accept": "*/*", "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
    });
  } catch (e) {
    return { url: u, status: "fail", code: 0, error: e?.message ?? String(e) };
  }
  if (!resp.ok) return { url: u, status: "fail", code: resp.status };

  const ct = (resp.headers.get("content-type") || "").toLowerCase();
  const isHtml = ct.startsWith("text/html") || ct.startsWith("application/xhtml");

  if (isHtml) {
    const text = await resp.text();
    await fs.writeFile(local, text, "utf8");
    return { url: u, status: "ok", path: local, html: text, ct };
  }
  await pipeline(resp.body, createWriteStream(local));
  return { url: u, status: "ok", path: local, ct };
}

let processed = 0;
function logResult(r, u) {
  processed++;
  const tag = (r.status === "ok" ? "OK" : r.status === "skip" ? "SKIP" : "FAIL").padEnd(4);
  const code = r.code ? ` (${r.code})` : "";
  const ext = path.extname(new URL(u).pathname).toLowerCase() || "(html)";
  console.log(`[${String(processed).padStart(4)}] ${tag}${code} ${ext.padEnd(6)} ${u}`);
}

async function crawlOne(u) {
  if (visited.has(u)) return;
  visited.add(u);
  let r;
  try { r = await downloadOne(u); } catch (e) {
    processed++; console.error(`[${String(processed).padStart(4)}] FAIL ${u}: ${e?.message ?? e}`); return;
  }
  logResult(r, u);

  if (r.status === "ok" && r.html) {
    const links = extractLinks(r.html, u);
    for (const link of links) {
      if (!isSameSite(link) || visited.has(link)) continue;
      if (shouldCrawlAsHtml(link)) queue.push(link);
      else assets.add(link);
    }
  }
  await sleep(DELAY_MS);
}

async function downloadAssets() {
  const items = [...assets].filter((u) => !visited.has(u));
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const u = items[i++];
      visited.add(u);
      try { logResult(await downloadOne(u), u); }
      catch (e) { processed++; console.error(`FAIL ${u}: ${e?.message ?? e}`); }
      await sleep(DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: MAX_CONCURRENCY }, () => worker()));
}

(async () => {
  await fs.mkdir(OUT_ROOT, { recursive: true });
  console.log(`Mirror target: ${OUT_ROOT}`);
  console.log(`Starting crawl at ${ROOT_URL}/`);
  queue.push(`${ROOT_URL}/`);
  while (queue.length) {
    const next = queue.shift();
    try { await crawlOne(next); } catch (e) { console.error(`FAIL ${next}: ${e?.message ?? e}`); }
  }
  console.log(`\nHTML pass complete (${processed} requests). Downloading ${assets.size} assets…`);
  await downloadAssets();
  console.log(`\nDone. ${processed} total requests. Files under ${OUT_ROOT}.`);
})().catch((e) => { console.error(e); process.exit(1); });
