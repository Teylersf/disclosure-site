/**
 * Upload disclosure-site/data/satellite/** to Linode under satellite/ prefix.
 * Skips identical-size files; never deletes (just like the other uploaders).
 *
 *   npm run sat:upload
 */

import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: path.resolve(__dirname, "..", "..", ".env") });

const req = (k: string) => {
  const v = process.env[k];
  if (!v) { console.error(`Missing env var: ${k}`); process.exit(1); }
  return v;
};

const ENDPOINT = req("LINODE_ENDPOINT");
const REGION = req("LINODE_REGION");
const BUCKET = req("LINODE_BUCKET");
const ACCESS_KEY = req("LINODE_ACCESS_KEY");
const SECRET_KEY = req("LINODE_SECRET_KEY");

const s3 = new S3Client({
  endpoint: ENDPOINT, region: REGION, forcePathStyle: false,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

const DATA = path.resolve(__dirname, "..", "..", "data", "satellite");

async function* walk(dir: string): AsyncGenerator<string> {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}
async function remoteSize(key: string): Promise<number | null> {
  try { const r = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })); return r.ContentLength ?? null; } catch { return null; }
}

async function main() {
  let uploaded = 0, skipped = 0, bytes = 0;
  for await (const file of walk(DATA)) {
    const rel = path.relative(DATA, file).replace(/\\/g, "/");
    const key = `satellite/${rel}`;
    const local = await fs.stat(file);
    const remote = await remoteSize(key);
    if (remote === local.size) { skipped++; continue; }
    const contentType = mime.lookup(file) || "application/octet-stream";
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: key, Body: createReadStream(file),
      ContentType: contentType, ContentLength: local.size, ACL: "public-read",
      CacheControl: "public, max-age=86400",
    }));
    console.log(`✓ ${(local.size / 1024).toFixed(1).padStart(8)} KB  ${key}`);
    uploaded++;
    bytes += local.size;
  }
  console.log(`\nUploaded: ${uploaded}  Skipped: ${skipped}  Bytes: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((e) => { console.error(e); process.exit(1); });
