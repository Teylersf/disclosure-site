import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getManifest } from "@/lib/manifest";
import { FINDINGS } from "@/lib/findings";
import { getTothemoon } from "@/lib/tothemoon";
import { INCIDENT_AOIS } from "@/lib/satellite-aois";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const m = getManifest();
  const ttm = getTothemoon();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/findings`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE_URL}/timeline`, lastModified: now, changeFrequency: "daily", priority: 0.92 },
    { url: `${SITE_URL}/missions`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/analyze`, lastModified: now, changeFrequency: "monthly", priority: 0.88 },
    { url: `${SITE_URL}/whitehouse-uap`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/satellite`, lastModified: now, changeFrequency: "daily", priority: 0.92 },
    { url: `${SITE_URL}/satellite/live`, lastModified: now, changeFrequency: "hourly", priority: 0.95 },
    { url: `${SITE_URL}/satellite/map`, lastModified: now, changeFrequency: "daily", priority: 0.93 },
    { url: `${SITE_URL}/satellite/iotd`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/tv`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/bundles`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  const programPages: MetadataRoute.Sitemap = ttm.programs.map((p) => ({
    url: `${SITE_URL}/missions/${p.toLowerCase()}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.85,
  }));

  const galleryPages: MetadataRoute.Sitemap = ttm.galleries.map((g) => ({
    url: `${SITE_URL}/missions/${g.program.toLowerCase()}/${g.mission_num}/${g.magazine}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // Mission landing pages (one per program × mission)
  const missionSeen = new Set<string>();
  const missionPages: MetadataRoute.Sitemap = [];
  for (const g of ttm.galleries) {
    const key = `${g.program.toLowerCase()}/${g.mission_num}`;
    if (missionSeen.has(key)) continue;
    missionSeen.add(key);
    missionPages.push({
      url: `${SITE_URL}/missions/${key}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    });
  }

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

  const incidentPages: MetadataRoute.Sitemap = INCIDENT_AOIS.map((aoi) => ({
    url: `${SITE_URL}/satellite/incident/${aoi.id}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticPages, ...findingPages, ...recordPages, ...programPages, ...missionPages, ...galleryPages, ...incidentPages];
}
