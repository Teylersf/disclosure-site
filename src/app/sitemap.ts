import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getManifest } from "@/lib/manifest";
import { FINDINGS } from "@/lib/findings";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const m = getManifest();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/findings`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/tv`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/bundles`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  const findingPages: MetadataRoute.Sitemap = FINDINGS.map((f) => ({
    url: `${SITE_URL}/findings/${f.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    // Tier 1 findings get max priority — these are the unique, high-intent pages
    priority: f.tier === 1 ? 0.9 : f.tier === 2 ? 0.7 : 0.6,
  }));

  const recordPages: MetadataRoute.Sitemap = m.records.map((r) => ({
    url: `${SITE_URL}/records/${r.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    // PR-073 (Columbus OH) and the relabeled D-series get a small bump
    priority: r.release === "release_2" ? 0.75 : 0.7,
  }));

  return [...staticPages, ...findingPages, ...recordPages];
}
