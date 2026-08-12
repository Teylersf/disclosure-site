/**
 * Site-wide constants for SEO + metadata.
 *
 * The site URL is read from NEXT_PUBLIC_SITE_URL. Set it in .env to the
 * canonical public URL where the site will be served (e.g. https://disclosure.example.com).
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://pursue.report").replace(/\/+$/, "");

export const SITE_NAME = "Disclosure — PURSUE 2026 UAP Archive";

export const SITE_DESCRIPTION = "Searchable archive of every record released by the U.S. Department of War PURSUE program — 375 declassified UAP / UFO documents, sensor videos, NASA Apollo/Space-Shuttle imagery, and FBI records across five 2026 releases (May 8, May 22, June 12, July 10, August 7), with independent metadata analysis and preserved source copies.";

export const SITE_SHORT_DESCRIPTION = "The complete PURSUE 2026 UAP archive — 375 records across 5 releases, findings, TV mode.";

export const SITE_KEYWORDS = [
  // primary subjects
  "UAP",
  "UFO",
  "PURSUE",
  "DOW-UAP",
  "AARO",
  "Department of War UFO files",
  "declassified UFO documents",
  "Pentagon UAP release 2026",
  // releases
  "May 8 2026 UFO release",
  "May 22 2026 UFO release",
  "June 12 2026 UFO release",
  "July 10 2026 UFO release",
  "August 7 2026 UFO release",
  "Release 03 PURSUE",
  "Release 04 PURSUE",
  "Release 05 PURSUE",
  "war.gov UFO",
  "war.gov UAP",
  // agencies
  "FBI UFO files",
  "NASA UAP",
  "CIA UAP 1973",
  "ODNI USPER UAP",
  "DoE UAP Sandia",
  "DoE UAP Pajarito",
  "DoE UAP Pantex",
  // long-tail / finding-specific
  "DOW-UAP-D20 Iraq Southern United States",
  "DOW-UAP-PR073 Columbus Ohio Edward Pajak",
  "PURSUE D to PR relabel crosswalk",
  "State Department Cable Kazakhstan Tajikistan",
  "war.gov UFO PDF metadata",
  "Apollo 12 medical debriefing UAP",
  "Gemini 7 UFO audio",
  "AFSOC Kabul UAP",
  "Spherical UAP AFG",
  "Iran UAP formation 2022",
  // release 3 finding-specific
  "Apollo 16 alien starbase 32:41",
  "NASA-UAP-D025 alien starbase",
  "Gordon Cooper Cronkite UFO 1962",
  "Colorado Springs UAP potato sunlight",
  "Western US Event UAP narratives",
  "Kardashev Sakharov UFO CIA",
  "CIA U-2 OXCART UAP-003",
  "Harare International Airport UFO 2008",
  "Robertson Panel CIA-UAP-002",
  "Western US Event Western US Event",
  "DoW PURSUE tradecraft cleanup release 3",
  // release 4 finding-specific
  "STS-80 Space Shuttle UFO images 1996",
  "NASA-UAP-D030 D031 D032 STS-80 Columbia",
  "Apollo 14 light flash phenomena debriefing",
  "Apollo 17 medical debriefing UAP",
  "East Coast UAP wave 2019 2020",
  "Gulf of America UAP 2019",
  "Project Sign 1948 progress report",
  "Project Blue Book 1955 CIA memoranda",
  "Highland Technologies PURSUE PDF vendor",
  "PURSUE release 4 July 10 2026",
  "PURSUE release 5 August 7 2026",
  "Gulf of Oman UAP videos 2021",
  "Pacific Ocean UAP videos 2019",
  // viewer features
  "UAP search",
  "UAP TV mode",
  "PURSUE EXIF viewer",
];

export const SITE_TWITTER = "@DeptofWar"; // canonical source account
export const SITE_LANG = "en-US";

/** Absolute URL helper. */
export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
