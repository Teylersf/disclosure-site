import data from "./whitehouse-uap.json";

export interface UapTweetMedia {
  type: "video" | "poster";
  file: string;
  source_url: string;
  size_bytes: number;
  md5: string;
  width?: number;
  height?: number;
  duration_ms?: number;
  codec?: string;
  bitrate_kbps?: number;
  aspect_ratio?: string;
  is_master?: boolean;
}

export interface UapTweet {
  tweet_id: string;
  tweet_url: string;
  account: string;
  account_id: string;
  account_verified_type?: string;
  posted_at: string;
  archived_at: string;
  text: string;
  engagement_at_capture: { favorites: number; conversations: number };
  wayback_url: string;
  media: UapTweetMedia[];
  notes?: string[];
  capture_date: string;
  bucket_prefix: string;
  public_urls: Record<string, string>;
  poster_url: string | null;
  master_video_url: string | null;
  master_video_width: number | null;
  master_video_height: number | null;
  duration_ms: number | null;
}

export interface UapTweetIndex {
  generatedAt: string;
  totalTweets: number;
  accounts: string[];
  entries: UapTweet[];
}

export function getWhitehouseUap(): UapTweetIndex {
  return data as unknown as UapTweetIndex;
}
