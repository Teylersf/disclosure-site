/**
 * Site-wide constants for SEO + metadata.
 *
 * The site URL is read from NEXT_PUBLIC_SITE_URL. Set it in .env to the
 * canonical public URL where the site will be served (e.g. https://disclosure.example.com).
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://disclosure-site.vercel.app").replace(/\/+$/, "");

export const SITE_NAME = "Disclosure — PURSUE 2026 UAP Archive";

export const SITE_DESCRIPTION =
  "Searchable archive of every record released by the U.S. Department of War PURSUE program — 222 declassified UAP / UFO documents, sensor videos, NASA Apollo audio, and FBI photographs from 2026, plus 13 independent findings the official catalog doesn't surface.";

export const SITE_SHORT_DESCRIPTION =
  "The complete PURSUE 2026 UAP archive — 222 records, 13 findings, TV mode.";

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
