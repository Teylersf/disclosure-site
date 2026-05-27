import timelineJson from "./timeline.json";

export interface TimelineVersion {
  capturedAt: string;
  size: number;
  md5: string;
  publicUrl: string;
}

export interface TimelineEntry {
  key: string;
  changeKind: "size-smaller" | "size-larger" | "size-similar" | "thumbnail-only";
  versions: TimelineVersion[];
}

export interface Timeline {
  generatedAt: string;
  captureDates: string[];
  totalFilesChanged: number;
  totalSizeChange: { before: number; after: number; deltaBytes: number };
  breakdown: Record<string, number>;
  entries: TimelineEntry[];
}

export function getTimeline(): Timeline {
  return timelineJson as unknown as Timeline;
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function shortFilename(key: string): string {
  const parts = key.split("/");
  return parts[parts.length - 1];
}
