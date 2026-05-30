import fallback from "./satellite.json";
import { INCIDENT_AOIS, type IncidentAoi } from "./satellite-aois";

const LIVE_MANIFEST_URL = `${(process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "https://disclosure.us-east-1.linodeobjects.com").replace(/\/+$/, "")}/satellite/satellite.json`;

export interface IotdEntry {
  date: string;
  title: string;
  link: string;
  description: string;
  image_url: string;
  size_bytes: number;
}

export interface IncidentCapture {
  source: string;
  layer?: string;
  file: string;
  url: string;
  size_bytes: number;
  resolution_m?: number;
  datetime_utc?: string;
  cloud_cover_percent?: number;
  platform?: string;
}

export interface IncidentDayBundle {
  aoi_id: string;
  date: string;
  captures: IncidentCapture[];
}

export interface GeostationaryFrame { hhmm: string; url: string; size_bytes: number }
export interface GeostationaryDay { date: string; frames: GeostationaryFrame[] }
export interface GeostationarySummary { total_days: number; total_frames: number; recent_days: GeostationaryDay[] }

export interface SatelliteData {
  generatedAt: string;
  aois: IncidentAoi[];
  iotd: IotdEntry[];
  global: Array<{ date: string; url: string; size_bytes: number }>;
  incidentDays: IncidentDayBundle[];
  geostationary?: Record<string, GeostationarySummary>;
}

// Fetch the live manifest from Linode (written by Modal's manifest_rebuild
// hourly). Revalidates every 60 s so pages pick up new captures within a
// minute of upload, without bundling a stale JSON into the deploy.
//
// On any error (network, Linode hiccup, manifest not yet written), fall
// back to the bundled fallback. The bundled file is the last manifest we
// committed locally — never stale by more than the deploy cadence.
export async function getSatellite(): Promise<SatelliteData> {
  try {
    const r = await fetch(LIVE_MANIFEST_URL, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });
    if (r.ok) {
      const j = await r.json();
      // Cheap sanity check: needs at least the aois field
      if (j && Array.isArray(j.aois)) return j as SatelliteData;
    }
  } catch {
    // fall through to local fallback
  }
  return fallback as unknown as SatelliteData;
}

export async function getIncidentDays(aoiId: string): Promise<IncidentDayBundle[]> {
  const sat = await getSatellite();
  return sat.incidentDays.filter((d) => d.aoi_id === aoiId);
}

export { INCIDENT_AOIS };
export type { IncidentAoi };
