/**
 * One-time setup: configure CORS on the Linode Object Storage bucket so the
 * /analyze page can read video pixels into a canvas without taint errors.
 *
 *   npm run setup-cors
 */

import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";
import { config as loadDotenv } from "dotenv";
import path from "node:path";

loadDotenv({ path: path.resolve(__dirname, "..", ".env") });

const required = (k: string) => {
  const v = process.env[k];
  if (!v) { console.error(`Missing env var: ${k}.`); process.exit(1); }
  return v;
};

const s3 = new S3Client({
  endpoint: required("LINODE_ENDPOINT"),
  region: required("LINODE_REGION"),
  credentials: {
    accessKeyId: required("LINODE_ACCESS_KEY"),
    secretAccessKey: required("LINODE_SECRET_KEY"),
  },
  forcePathStyle: false,
});

const BUCKET = required("LINODE_BUCKET");

async function main() {
  const config = {
    CORSRules: [
      {
        AllowedOrigins: [
          "https://pursue.report",
          "https://www.pursue.report",
          "https://disclosure-site.vercel.app",
          "https://disclosure-site-*.vercel.app",
          "http://localhost:3000",
          "http://localhost:3001",
        ],
        AllowedMethods: ["GET", "HEAD"],
        AllowedHeaders: ["*"],
        ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
        MaxAgeSeconds: 86400,
      },
    ],
  };
  await s3.send(new PutBucketCorsCommand({ Bucket: BUCKET, CORSConfiguration: config }));
  console.log(`✓ Set CORS on bucket "${BUCKET}":`);
  console.log(JSON.stringify(config, null, 2));

  console.log();
  const live = await s3.send(new GetBucketCorsCommand({ Bucket: BUCKET }));
  console.log("Verified live CORS rules:");
  console.log(JSON.stringify(live.CORSRules, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
