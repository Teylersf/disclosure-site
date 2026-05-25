export type RecordType = "PDF" | "VID" | "IMG" | "AUD";

export interface VideoFile {
  src: string;
  width: number;
  height: number;
  size: number;
  bitrate?: number;
  type: string;
}

export interface DvidsMeta {
  id: string;
  title: string;
  description: string;
  date_published: string;
  date?: string;
  duration: number;
  files: VideoFile[];
  thumbnail?: { url: string; width: number; height: number };
  image?: string;
  hls_url?: string;
  closed_captions?: { srt?: string; webvtt?: string };
}

export interface UapRecord {
  id: string;
  type: RecordType;
  title: string;
  agency: string;
  description: string;
  incidentDate: string;
  incidentLocation: string;
  releaseDate: string;
  release: "release_1" | "release_2";
  redacted: boolean;
  imageAlt?: string;
  imageVirin?: string;

  asset?: { url: string; bytes?: number };
  thumbnail?: { url: string; bytes?: number };

  dvidsId?: string;
  dvids?: DvidsMeta;
}

export interface Manifest {
  generatedAt: string;
  totalCount: number;
  byType: Record<RecordType, number>;
  byRelease: Record<string, number>;
  byAgency: Record<string, number>;
  agencies: string[];
  releases: string[];
  records: UapRecord[];
}
