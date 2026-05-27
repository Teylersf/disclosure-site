import type { Metadata } from "next";
import { Cpu } from "lucide-react";
import VideoAnalyzer from "@/components/VideoAnalyzer";
import { getManifest } from "@/lib/manifest";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Video Analysis Lab — frame-step, filters, edge detection, histogram, screenshots",
  description:
    "Browser-based forensic-grade analysis of every UAP video in the PURSUE release. Frame-by-frame stepping, slow-motion to 0.1×, edge detection, frame-difference mode, RGB histogram, color picker, A-B loop, annotation pins, pixel-perfect zoom up to 16×, screenshot export. No install. No upload of your data anywhere.",
  keywords: [
    "UAP video analysis",
    "PURSUE video analyzer",
    "frame-by-frame UFO video",
    "Columbus Ohio UAP analysis",
    "edge detection UFO footage",
    "DOW-UAP frame analysis",
    "infrared sensor UAP analysis",
    "AARO video forensics",
  ],
  alternates: { canonical: "/analyze" },
  openGraph: {
    type: "website",
    title: "Video Analysis Lab — Disclosure",
    description: "Frame-perfect forensic analysis for every PURSUE UAP video, in the browser.",
    url: absoluteUrl("/analyze"),
    siteName: SITE_NAME,
  },
};

export default function AnalyzePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const m = getManifest();
  return (
    <AnalyzeWrapper recordsPromise={searchParams} manifest={m} />
  );
}

async function AnalyzeWrapper({ recordsPromise, manifest }: { recordsPromise: Promise<{ id?: string }>; manifest: ReturnType<typeof getManifest> }) {
  const sp = await recordsPromise;
  return (
    <div className="px-4 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-[var(--accent)] uppercase">
            <Cpu size={12}/> Analysis lab
          </div>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight gradient-text">Video Analysis Lab</h1>
          <p className="text-[var(--muted)] text-xs md:text-sm mt-1">
            Frame-step, filter, measure, annotate, screenshot. Everything runs in your browser — no upload, no server processing.
          </p>
        </div>
      </div>
      <VideoAnalyzer records={manifest.records} initialId={sp.id} />
    </div>
  );
}
