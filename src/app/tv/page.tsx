import type { Metadata } from "next";
import TvMode from "@/components/TvMode";
import { getManifest } from "@/lib/manifest";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "TV Mode — autoplay every declassified UAP video",
  description:
    "Watch all 85 declassified UAP videos and Apollo audio recordings from the PURSUE 2026 release in sequence. Shuffle, loop, keyboard shortcuts (Space, arrows, M, S, L, B), and a sidebar queue.",
  keywords: [
    "UAP TV mode",
    "watch declassified UFO videos",
    "PURSUE 2026 videos",
    "autoplay UAP videos",
    "DOW-UAP videos",
    "AARO videos",
    "Apollo UFO audio",
  ],
  alternates: { canonical: "/tv" },
  openGraph: {
    title: "TV Mode — every PURSUE 2026 UAP video, autoplayed",
    description: "Watch all 85 declassified UAP videos in sequence.",
    url: absoluteUrl("/tv"),
  },
};

export default function TvPage() {
  const m = getManifest();
  const videos = m.records.filter((r) => r.type === "VID" || r.type === "AUD");
  return <TvMode videos={videos} />;
}
