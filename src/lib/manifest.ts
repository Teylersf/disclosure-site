import manifestJson from "./manifest.json";
import type { Manifest, UapRecord } from "./types";

export function getManifest(): Manifest {
  return manifestJson as unknown as Manifest;
}

export function getRecord(id: string): UapRecord | undefined {
  return getManifest().records.find((r) => r.id === id);
}

export function getAllRecordIds(): string[] {
  return getManifest().records.map((r) => r.id);
}
