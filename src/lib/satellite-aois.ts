/**
 * UAP-incident Areas of Interest for satellite-imagery archival.
 *
 * Each AOI maps to a real-world location named in the PURSUE records.
 * Coordinates are the centre point we snapshot daily; bbox is what we
 * pass to GIBS / Sentinel-2 STAC for area-targeted captures.
 *
 * Hand-curated from the manifest; we deliberately exclude vague
 * locations like "CENTCOM" or "Western United States" because they
 * span too much area to be meaningful in single-frame imagery.
 */

export interface IncidentAoi {
  /** stable URL slug */
  id: string;
  /** human display name */
  name: string;
  /** centre coordinates */
  lat: number;
  lng: number;
  /** bounding box [minLng, minLat, maxLng, maxLat] — ~50km radius */
  bbox: [number, number, number, number];
  /** corresponding PURSUE record ids (optional — for cross-linking) */
  records?: string[];
  /** short context */
  context: string;
}

// Helper: build a ~50km bbox around a centre point (rough — lat scales).
function box(lat: number, lng: number, kmRadius = 50): [number, number, number, number] {
  const dLat = kmRadius / 111;
  const dLng = kmRadius / (111 * Math.cos((lat * Math.PI) / 180));
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

export const INCIDENT_AOIS: IncidentAoi[] = [
  {
    id: "sandia-base-nm",
    name: "Sandia Base, New Mexico",
    lat: 35.0577, lng: -106.5494,
    bbox: box(35.0577, -106.5494),
    context: "1948–1950 series of UAP sightings investigated by the AFSWP — DOW-UAP-D017 (116 pages).",
    records: ["pdf-dow-uap-d017-uap-reported-at-sandia-base-1948-1950"],
  },
  {
    id: "lake-huron",
    name: "Lake Huron",
    lat: 44.5, lng: -82.5,
    bbox: box(44.5, -82.5, 80),
    context: "F-16 shoot-down of an unidentified object, February 2023 — DOW-UAP-PR071.",
  },
  {
    id: "columbus-oh",
    name: "Columbus, Ohio",
    lat: 39.9612, lng: -82.9988,
    bbox: box(39.9612, -82.9988),
    context: "Multi-witness UAP encounter — DOW-UAP-PR073.",
  },
  {
    id: "eglin-afb",
    name: "Eglin AFB, Florida",
    lat: 30.4630, lng: -86.5520,
    bbox: box(30.4630, -86.5520),
    context: "Aircrew UAP observation IIR 1 655 S0301 23 — DOW-UAP-PR070.",
  },
  {
    id: "strait-of-hormuz",
    name: "Strait of Hormuz",
    lat: 26.5667, lng: 56.2500,
    bbox: box(26.5667, 56.2500, 60),
    context: "Naval encounters Sept & Oct 2020 — DOW-UAP-D062 + D063.",
  },
  {
    id: "persian-gulf",
    name: "Persian Gulf",
    lat: 26.5, lng: 51.5,
    bbox: box(26.5, 51.5, 80),
    context: "Multiple UAP formations and observations — DOW-UAP-PR091, PR098.",
  },
  {
    id: "iran-tehran",
    name: "Iran (Tehran region)",
    lat: 35.7, lng: 51.4,
    bbox: box(35.7, 51.4, 80),
    context: "Mission Report Nov 2020 — DOW-UAP-D064. Iran AOI for UAP formation 26 Aug 2022 — DOW-UAP-PR050.",
  },
  {
    id: "syria",
    name: "Syria",
    lat: 35.0, lng: 38.0,
    bbox: box(35.0, 38.0, 100),
    context: "\"Syrian UAP instant acceleration\" — DOW-UAP-PR051.",
  },
  {
    id: "iraq",
    name: "Iraq",
    lat: 33.0, lng: 44.0,
    bbox: box(33.0, 44.0, 100),
    context: "Multiple CENTCOM AOR UAP reports.",
  },
  {
    id: "papua-new-guinea",
    name: "Papua New Guinea",
    lat: -6.3149, lng: 143.9555,
    bbox: box(-6.3149, 143.9555, 100),
    context: "State Department UAP Cable 001, January 28, 1985 — DOS-UAP-D1.",
  },
  {
    id: "kazakhstan",
    name: "Kazakhstan",
    lat: 48.0, lng: 66.9237,
    bbox: box(48.0, 66.9237, 100),
    context: "State Department UAP Cable 002, January 1994 — DOS-UAP-D2.",
  },
  {
    id: "white-sands-nm",
    name: "White Sands, New Mexico",
    lat: 32.3833, lng: -106.4833,
    bbox: box(32.3833, -106.4833),
    context: "Historical UAP cluster in the New Mexico high-desert proving grounds.",
  },
];

export function getAoi(id: string): IncidentAoi | undefined {
  return INCIDENT_AOIS.find((a) => a.id === id);
}
