/**
 * Site-wide constants for SEO + metadata.
 *
 * The site URL is read from NEXT_PUBLIC_SITE_URL. Set it in .env to the
 * canonical public URL where the site will be served (e.g. https://disclosure.example.com).
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://pursue.report").replace(/\/+$/, "");

export const SITE_NAME = "Disclosure — PURSUE 2026 UAP Archive";

export const SITE_DESCRIPTION =
  "Searchable archive of every record released by the U.S. Department of War PURSUE program — 294 declassified UAP / UFO documents, sensor videos, NASA Apollo audio, and FBI photographs across three 2026 releases (May 8, May 22, June 12), plus 22 independent findings the official catalog doesn't surface.";

export const SITE_SHORT_DESCRIPTION =
  "The complete PURSUE 2026 UAP archive — 294 records across 3 releases, 22 findings, TV mode.";

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
  "Release 03 PURSUE",
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
