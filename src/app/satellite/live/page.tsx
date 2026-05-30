import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Satellite } from "lucide-react";
import LiveFrameViewer from "@/components/satellite/LiveFrameViewer";
import { getSatellite } from "@/lib/satellite";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Live satellite frames — GOES + Himawari geostationary archive",
  description:
    "Every 30 minutes, our pipeline captures the latest full-disc frame from GOES-East, GOES-West, and Himawari and archives it forever on Linode. Browse today's captures with a time-lapse, scrub through any frame, download the JPEG.",
  alternates: { canonical: "/satellite/live" },
  openGraph: {
    type: "website",
    title: "Live satellite frames · pursue.report",
    description: "GOES + Himawari full-disc captures every 30 min, archived forever.",
    url: absoluteUrl("/satellite/live"),
    siteName: SITE_NAME,
  },
};

export default async function LiveFramesPage() {
  const sat = await getSatellite();

  return (
    <div className="max-w-[1400px] mx-auto px-3 md:px-6 py-4">
      <Link href="/satellite" className="text-xs text-[var(--accent-glow)] inline-flex items-center gap-1 mb-3">
        <ArrowLeft size={12}/> Satellite archive
      </Link>

      <header className="mb-4">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-[var(--accent)] uppercase mb-2">
          <Satellite size={12}/> Live geostationary frames
        </div>
        <h1 className="text-2xl md:text-3xl font-bold gradient-text">Watch Earth, every 30 minutes</h1>
        <p className="text-xs md:text-sm text-[var(--muted)] mt-2 max-w-3xl leading-relaxed">
          Our Modal pipeline pulls the latest frame from GOES-East, GOES-West, and Himawari every 30 minutes and
          stores it forever on Linode. Pick a satellite, scrub through today&apos;s captures, or hit play to time-lapse
          the day. Click the download icon to save any frame at full resolution.
        </p>
      </header>

      <LiveFrameViewer data={sat} />
    </div>
  );
}
