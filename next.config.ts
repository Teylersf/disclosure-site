import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Vercel's image optimizer entirely. Every image we serve already
  // lives on Linode (or is a static asset) — running it through Vercel's
  // /_next/image transformer would burn money on both
  //   - image-optimization-image-transformations
  //   - image-optimization-image-cache-writes
  // for zero user benefit. Anything that needs resizing is done up-front
  // (build-time) or by the browser. `unoptimized: true` is the canonical
  // off-switch — with it set, Next.js doesn't even mount the /_next/image
  // route, so both billing lines drop to 0.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
