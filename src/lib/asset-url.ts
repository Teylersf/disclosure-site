/**
 * Asset URL resolver.
 *
 * Records carry an "asset key" like:
 *   www.war.gov/medialink/ufo/release_1/foo.pdf
 *   d34w7g4gy10iej.cloudfront.net/video/2605/.../bar.mp4
 *
 * In production, set NEXT_PUBLIC_ASSET_BASE_URL to your Linode Object Storage
 * bucket's public URL (e.g. https://disclosure.us-east-1.linodeobjects.com)
 * and the key is appended directly.
 *
 * In dev (no env set), the URL points to /api/asset/<key>, which streams the
 * file from the parent mirror directory.
 */

export function assetUrl(key: string | undefined): string {
  if (!key) return "";
  const cleaned = key.replace(/^\/+/, "");
  const base = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  if (base) {
    const trimmed = base.replace(/\/+$/, "");
    return `${trimmed}/${cleaned.split("/").map(encodeURIComponent).join("/")}`;
  }
  // Dev fallback: proxy through the Next API route
  return `/api/asset/${cleaned.split("/").map(encodeURIComponent).join("/")}`;
}

/** Returns true if the asset is being served from a configured CDN. */
export function isRemoteAssets(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ASSET_BASE_URL);
}
