/**
 * Sync the mirror to Linode Object Storage.
 *
 * Required environment variables (place in disclosure-site/.env):
 *   LINODE_ENDPOINT       e.g. https://us-east-1.linodeobjects.com
 *   LINODE_REGION         e.g. us-east-1
 *   LINODE_BUCKET         e.g. disclosure
 *   LINODE_ACCESS_KEY     S3-compatible access key
 *   LINODE_SECRET_KEY     S3-compatible secret key
 *
 * Optional:
 *   LINODE_PREFIX         path prefix inside the bucket (default: empty)
 *   UPLOAD_CONCURRENCY    parallel uploads (default: 8)
 *   DRY_RUN               set to "1" to list what would upload without sending
 *
 * Usage:
 *   npm run upload          # upload everything new/changed
 *   DRY_RUN=1 npm run upload  # preview
 */

import { promises as fs, createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import mime from "mime-types";

// Files larger than this get a multipart upload (chunked, resumable per-part).
// Below this, a single PutObject is faster and uses less memory.
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100 MB

// Load .env from the disclosure-site root
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: path.resolve(__dirname, "..", ".env") });

const MIRROR_ROOT = path.resolve(__dirname, "..", "..");
const ALLOWED_HOSTS = [
  "www.war.gov",
  "d34w7g4gy10iej.cloudfront.net",
  "d1ldvf68ux039x.cloudfront.net",
  "api.dvidshub.net",
  "media.defense.gov",
  "fonts.gstatic.com",
  "fonts.googleapis.com",
  "cdn.datatables.net",
  "cdn.jsdelivr.net",
  "tothemoon.im-ldi.com",
];

const ENDPOINT = required("LINODE_ENDPOINT");
const REGION = required("LINODE_REGION");
const BUCKET = required("LINODE_BUCKET");
const ACCESS_KEY = required("LINODE_ACCESS_KEY");
const SECRET_KEY = required("LINODE_SECRET_KEY");
const PREFIX = (process.env.LINODE_PREFIX ?? "").replace(/^\/+|\/+$/g, "");
const CONCURRENCY = Math.max(1, Number(process.env.UPLOAD_CONCURRENCY ?? 8));
const DRY = process.env.DRY_RUN === "1" || process.argv.includes("--dry");

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var: ${name}. Set it in disclosure-site/.env`);
    process.exit(1);
  }
  return v;
}

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  forcePathStyle: false, // Linode supports virtual-hosted style: <bucket>.<region>.linodeobjects.com
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile()) yield full;
  }
}

async function existsOnRemote(key: string, size: number): Promise<boolean> {
  try {
    const out = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return out.ContentLength === size;
  } catch (e: unknown) {
    const err = e as { $metadata?: { httpStatusCode?: number } };
    if (err.$metadata?.httpStatusCode === 404) return false;
    throw e;
  }
}

async function uploadOne(filePath: string, key: string, size: number) {
  if (await existsOnRemote(key, size)) {
    return { key, status: "skip" as const, size };
  }
  if (DRY) return { key, status: "dry" as const, size };
  const ct = mime.lookup(filePath) || "application/octet-stream";

  if (size >= MULTIPART_THRESHOLD) {
    // Multipart for big files (resumable per part, no single-stream timeout)
    const upload = new Upload({
      client: s3,
      params: {
        Bucket: BUCKET,
        Key: key,
        Body: createReadStream(filePath),
        ContentType: ct,
        ACL: "public-read",
        CacheControl: "public, max-age=86400",
      },
      partSize: 16 * 1024 * 1024, // 16 MB parts
      queueSize: 4,               // 4 parts in flight per file
      leavePartsOnError: false,
    });
    await upload.done();
  } else {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: createReadStream(filePath),
      ContentType: ct,
      ContentLength: size,
      ACL: "public-read",
      CacheControl: "public, max-age=86400",
    }));
  }
  return { key, status: "uploaded" as const, size };
}

async function main() {
  console.log(`Endpoint:   ${ENDPOINT}`);
  console.log(`Bucket:     ${BUCKET}${PREFIX ? `/${PREFIX}` : ""}`);
  console.log(`Concurrency: ${CONCURRENCY}${DRY ? " · DRY RUN" : ""}`);

  // Collect files
  const files: { path: string; key: string; size: number }[] = [];
  for (const host of ALLOWED_HOSTS) {
    const hostDir = path.join(MIRROR_ROOT, host);
    try {
      await fs.access(hostDir);
    } catch {
      continue;
    }
    for await (const full of walk(hostDir)) {
      const rel = path.relative(MIRROR_ROOT, full).split(path.sep).join("/");
      // Skip user's waifu2x upscale artifacts
      if (rel.includes("_SplitFrames_W2xEX") || rel.endsWith(".W2xEX") || rel.endsWith("_waifu2x_2x_mp4.mkv")) continue;
      const key = PREFIX ? `${PREFIX}/${rel}` : rel;
      const s = await stat(full);
      files.push({ path: full, key, size: s.size });
    }
  }
  console.log(`Found ${files.length} files (${(files.reduce((a, f) => a + f.size, 0) / 1024 / 1024 / 1024).toFixed(2)} GB).`);

  // Run with concurrency
  const counts = { uploaded: 0, skip: 0, dry: 0, error: 0 };
  let bytesUploaded = 0;
  let done = 0;
  const queue = [...files];

  async function worker(id: number) {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      try {
        const r = await uploadOne(item.path, item.key, item.size);
        counts[r.status]++;
        if (r.status === "uploaded") bytesUploaded += r.size;
        done++;
        const pct = ((done / files.length) * 100).toFixed(1);
        const tag = r.status.toUpperCase().padEnd(8);
        console.log(`[${pct}%] [w${id}] ${tag} ${(item.size / 1024).toFixed(0).padStart(8)} KB  ${item.key}`);
      } catch (e) {
        counts.error++;
        done++;
        console.error(`[FAIL] ${item.key}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));

  console.log("");
  console.log(`Uploaded: ${counts.uploaded} files (${(bytesUploaded / 1024 / 1024 / 1024).toFixed(2)} GB)`);
  console.log(`Skipped:  ${counts.skip} (already present at correct size)`);
  if (counts.dry) console.log(`Dry-run:  ${counts.dry} would upload`);
  if (counts.error) console.log(`Errors:   ${counts.error}`);

  // Print the public URL pattern so you know what to set NEXT_PUBLIC_ASSET_BASE_URL to
  console.log("");
  console.log("Public URL pattern (set in .env):");
  console.log(`  NEXT_PUBLIC_ASSET_BASE_URL=https://${BUCKET}.${REGION}.linodeobjects.com${PREFIX ? `/${PREFIX}` : ""}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
