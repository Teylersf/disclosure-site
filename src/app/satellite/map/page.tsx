import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SatelliteMap from "@/components/satellite/SatelliteMap";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Interactive satellite map — 30+ NASA GIBS layers, time-slider, every UAP site marked",
  description:
    "Browser-based interactive Earth map with 30+ NASA GIBS layers (VIIRS, MODIS, GOES, Himawari, fire, IR, ocean, atmosphere, night-lights), day-by-day time slider, deep zoom, deep-linkable URL state, screenshot export. Every UAP incident site from the PURSUE files marked and pin-clickable.",
  keywords: [
    "interactive satellite map",
    "NASA GIBS viewer",
    "free satellite map online",
    "Worldview alternative",
    "UAP incident satellite map",
    "GOES-16 GeoColor live",
    "VIIRS night lights map",
  ],
  alternates: { canonical: "/satellite/map" },
  openGraph: {
    type: "website",
    title: "Interactive satellite map · 30+ NASA layers",
    description: "Time-slider, deep zoom, screenshot, deep-linkable URLs. Every UAP incident site marked.",
    url: absoluteUrl("/satellite/map"),
    siteName: SITE_NAME,
  },
};

interface PageProps {
  searchParams: Promise<{ date?: string; base?: string; overlays?: string }>;
}

export default async function SatelliteMapPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const overlays = sp.overlays ? sp.overlays.split(",").filter(Boolean) : undefined;

  return (
    <div className="max-w-[1800px] mx-auto px-3 md:px-4 py-4 h-full flex flex-col">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <Link href="/satellite" className="text-xs text-[var(--accent-glow)] inline-flex items-center gap-1 mb-1">
            <ArrowLeft size={12}/> Satellite archive
          </Link>
          <h1 className="text-xl md:text-2xl font-bold gradient-text leading-tight">Interactive satellite map</h1>
          <p className="text-[11px] text-[var(--muted)] mt-0.5">30+ NASA GIBS layers · time-slider · deep zoom · all UAP sites marked · share by URL</p>
        </div>
      </header>
      <div className="flex-1 min-h-0">
        <SatelliteMap initialDate={sp.date} initialBase={sp.base} initialOverlays={overlays} />
      </div>
    </div>
  );
}
