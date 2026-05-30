import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, Layers } from "lucide-react";
import { getSatellite, INCIDENT_AOIS, type IncidentDayBundle } from "@/lib/satellite";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import IncidentScrubber from "@/components/satellite/IncidentScrubber";

interface PageProps { params: Promise<{ id: string }> }

export async function generateStaticParams() {
  return INCIDENT_AOIS.map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const aoi = INCIDENT_AOIS.find((a) => a.id === id);
  if (!aoi) return { title: "Not found" };
  return {
    title: `${aoi.name} — daily satellite imagery archive`,
    description: `Multi-sensor daily satellite imagery over ${aoi.name}. Sentinel-2 10m, MODIS 250m, VIIRS 375m. ${aoi.context}`,
    keywords: [aoi.name, "satellite imagery", "UAP incident", "Sentinel-2", "VIIRS", "MODIS"],
    alternates: { canonical: `/satellite/incident/${aoi.id}` },
    openGraph: {
      type: "article",
      title: `${aoi.name} — satellite archive`,
      description: aoi.context,
      url: absoluteUrl(`/satellite/incident/${aoi.id}`),
      siteName: SITE_NAME,
    },
  };
}

export default async function IncidentPage({ params }: PageProps) {
  const { id } = await params;
  const aoi = INCIDENT_AOIS.find((a) => a.id === id);
  if (!aoi) notFound();

  const sat = getSatellite();
  const days: IncidentDayBundle[] = sat.incidentDays
    .filter((d) => d.aoi_id === id)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
      <Link href="/satellite" className="text-xs text-[var(--accent-glow)] inline-flex items-center gap-1 mb-3">
        <ArrowLeft size={12}/> All incident sites
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-[var(--accent)] uppercase mb-2">
          <MapPin size={12}/> UAP incident site
        </div>
        <h1 className="text-3xl md:text-4xl font-bold gradient-text">{aoi.name}</h1>
        <div className="text-[11px] font-mono text-[var(--muted)] mt-2">
          {aoi.lat.toFixed(4)}°N, {aoi.lng.toFixed(4)}°E · bbox [{aoi.bbox.map((n) => n.toFixed(2)).join(", ")}]
        </div>
        <p className="text-[var(--muted)] mt-3 text-sm leading-relaxed max-w-3xl">{aoi.context}</p>
        <div className="flex flex-wrap gap-2 mt-4 text-xs">
          <span className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg-1)]">
            <Calendar size={11} className="inline mr-1"/>
            {days.length} day{days.length === 1 ? "" : "s"} archived
          </span>
          <span className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg-1)]">
            <Layers size={11} className="inline mr-1"/>
            {days.reduce((sum, d) => sum + d.captures.length, 0)} total captures
          </span>
          <a
            href={`https://worldview.earthdata.nasa.gov/?v=${aoi.bbox[0]},${aoi.bbox[1]},${aoi.bbox[2]},${aoi.bbox[3]}`}
            target="_blank" rel="noreferrer"
            className="px-2 py-1 rounded border border-[var(--accent)] text-[var(--accent)]"
          >
            Open in NASA Worldview ↗
          </a>
        </div>
      </header>

      {days.length === 0 ? (
        <div className="card p-10 text-center text-[var(--muted)]">
          No satellite captures archived yet for this location. The daily fetcher runs in the morning UTC.
        </div>
      ) : (
        <IncidentScrubber aoi={aoi} days={days} />
      )}
    </div>
  );
}
