/**
 * Fetch NASA Earth Observatory Image of the Day (IOTD).
 * https://earthobservatory.nasa.gov/feeds/image-of-the-day.rss
 *
 * Strategy:
 *   1. Pull the RSS feed (last ~20 days)
 *   2. For each entry not already in data/satellite/iotd/<date>/, fetch
 *      the full-res image, title, description, lat/lng if present
 *   3. Save into data/satellite/iotd/<YYYY-MM-DD>/{image.jpg, meta.json}
 *
 * Run:
 *   npm run sat:fetch-iotd
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const SITE_ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.join(SITE_ROOT, "data", "satellite", "iotd");

const UA = "Mozilla/5.0 (compatible; pursue.report/1.0; +https://pursue.report)";

interface IotdEntry {
  date: string;          // YYYY-MM-DD
  title: string;
  link: string;          // https://earthobservatory.nasa.gov/images/NNNNN/...
  description: string;
  imageUrl: string;      // full-res
  thumbUrl?: string;
  pubDate: string;       // ISO
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Crude but effective RSS parser for the IOTD feed.
function parseRss(xml: string): IotdEntry[] {
  const items: IotdEntry[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const body = match[1];
    const get = (tag: string): string => {
      const m = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(body);
      if (!m) return "";
      let v = m[1];
      // strip CDATA
      v = v.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
      return v.trim();
    };
    const title = get("title");
    const link = get("link");
    const pubDate = get("pubDate");
    const description = get("description");
    // The NASA Science feed puts the full WordPress content (with images) in
    // <content:encoded>, while <description> only has the lede paragraph.
    const contentMatch = /<content:encoded>([\s\S]*?)<\/content:encoded>/.exec(body);
    let contentEncoded = contentMatch ? contentMatch[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "") : "";

    // Find the first useful image. NASA Science wraps images in <figure>; the
    // first <img src> is usually the hero shot. Filter out any obvious icons.
    let imageUrl = "";
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let im;
    while ((im = imgRegex.exec(contentEncoded)) !== null) {
      const u = im[1];
      // Skip site chrome (svg icons, sprites, profile photos)
      if (/\.(svg)(\?|$)/i.test(u)) continue;
      if (/avatar|gravatar|icon|sprite/i.test(u)) continue;
      imageUrl = u;
      break;
    }
    // Fallback: look in the description too
    if (!imageUrl) {
      const fb = /<img[^>]+src=["']([^"']+)["']/i.exec(description);
      if (fb) imageUrl = fb[1];
    }

    // Pub date is RFC822 — convert to ISO YYYY-MM-DD
    const d = new Date(pubDate);
    const date = isNaN(d.getTime()) ? "" : ymd(d);

    if (date && imageUrl) {
      items.push({ date, title, link, description, imageUrl, pubDate });
    }
  }
  return items;
}

async function exists(p: string): Promise<boolean> { try { await fs.access(p); return true; } catch { return false; } }

async function main() {
  console.log("Fetching NASA Earth Observatory Image of the Day feed…");
  const rssUrl = "https://earthobservatory.nasa.gov/feeds/image-of-the-day.rss";
  const rss = await fetch(rssUrl, { headers: { "User-Agent": UA } });
  if (!rss.ok) { console.error(`✗ RSS fetch failed: HTTP ${rss.status}`); process.exit(1); }
  const xml = await rss.text();
  const entries = parseRss(xml);
  console.log(`  ${entries.length} entries in feed.`);

  let added = 0, skipped = 0;
  for (const e of entries) {
    const dayDir = path.join(OUT_DIR, e.date);
    const imgPath = path.join(dayDir, "image.jpg");
    const metaPath = path.join(dayDir, "meta.json");

    if (await exists(metaPath)) { skipped++; continue; }

    // For the image, the IOTD description img usually points at a width-restricted
    // thumb. Upgrade to full-res by stripping any width suffix like _th.jpg / _lrg.jpg
    // and prefer the full one. The structure is /<NN>/...image_filename.jpg
    let imgUrl = e.imageUrl;
    // Common pattern: "/blogs/eoimages/images/<N>/<date>/<slug>/<slug>.jpg" — that IS full res.
    // Some go through Cloudinary-style; let's just download whatever we got.

    try {
      const r = await fetch(imgUrl, { headers: { "User-Agent": UA } });
      if (!r.ok) { console.log(`  ✗ ${e.date} image HTTP ${r.status}`); continue; }
      const body = Buffer.from(await r.arrayBuffer());
      await fs.mkdir(dayDir, { recursive: true });
      await fs.writeFile(imgPath, body);
      // Strip HTML from description for a cleaner meta
      const cleanDesc = e.description.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 4000);
      const meta = {
        source: "nasa-eo-iotd",
        date: e.date,
        title: e.title,
        link: e.link,
        description: cleanDesc,
        pubDate: e.pubDate,
        image: {
          file: "image.jpg",
          source_url: imgUrl,
          size_bytes: body.length,
        },
      };
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
      added++;
      console.log(`  ✓ ${e.date}  ${(body.length / 1024).toFixed(1).padStart(7)} KB  ${e.title.slice(0, 60)}`);
    } catch (err) {
      console.log(`  ✗ ${e.date} ${(err as Error).message}`);
    }
  }

  console.log(`\nIOTD: ${added} added, ${skipped} already present.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
