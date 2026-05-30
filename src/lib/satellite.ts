import data from "./satellite.json";
import { INCIDENT_AOIS, type IncidentAoi } from "./satellite-aois";

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

export interface SatelliteData {
  generatedAt: string;
  aois: IncidentAoi[];
  iotd: IotdEntry[];
  global: Array<{ date: string; url: string; size_bytes: number }>;
  incidentDays: IncidentDayBundle[];
}

export function getSatellite(): SatelliteData {
  return data as unknown as SatelliteData;
}

export function getIncidentDays(aoiId: string): IncidentDayBundle[] {
  return getSatellite().incidentDays.filter((d) => d.aoi_id === aoiId);
}

export { INCIDENT_AOIS };
export type { IncidentAoi };
