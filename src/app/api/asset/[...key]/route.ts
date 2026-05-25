import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import mime from "mime-types";

export const dynamic = "force-dynamic";

const MIRROR_ROOT = path.resolve(process.cwd(), "..");

// Only allow these top-level "host" directories to be served.
const ALLOWED_HOSTS = new Set([
  "www.war.gov",
  "d34w7g4gy10iej.cloudfront.net",
  "d1ldvf68ux039x.cloudfront.net",
  "api.dvidshub.net",
  "media.defense.gov",
  "fonts.gstatic.com",
  "fonts.googleapis.com",
  "cdn.datatables.net",
  "cdn.jsdelivr.net",
]);

export async function GET(
  req: Request,
  ctx: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  const { key } = await ctx.params;
  if (!key || key.length === 0) return new Response("Not found", { status: 404 });

  const host = key[0];
  if (!ALLOWED_HOSTS.has(host)) return new Response("Forbidden", { status: 403 });

  const relPath = key.map((s) => decodeURIComponent(s)).join("/");
  const fullPath = path.join(MIRROR_ROOT, relPath);

  // Prevent path traversal
  const normalized = path.resolve(fullPath);
  if (!normalized.startsWith(path.resolve(MIRROR_ROOT))) {
    return new Response("Forbidden", { status: 403 });
  }

  let s;
  try {
    s = await stat(normalized);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!s.isFile()) return new Response("Not found", { status: 404 });

  const range = req.headers.get("range");
  const contentType = mime.lookup(normalized) || "application/octet-stream";
  const baseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
  };

  if (range) {
    const m = /bytes=(\d+)-(\d+)?/.exec(range);
    if (m) {
      const start = parseInt(m[1], 10);
      const end = m[2] ? parseInt(m[2], 10) : s.size - 1;
      if (start >= s.size || end >= s.size) {
        return new Response(null, {
          status: 416,
          headers: { ...baseHeaders, "Content-Range": `bytes */${s.size}` },
        });
      }
      const stream = createReadStream(normalized, { start, end });
      const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;
      return new Response(webStream, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${start}-${end}/${s.size}`,
          "Content-Length": String(end - start + 1),
        },
      });
    }
  }

  const stream = createReadStream(normalized);
  const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;
  return new Response(webStream, {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(s.size) },
  });
}
