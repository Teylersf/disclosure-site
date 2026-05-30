import type { Metadata } from "next";
import Link from "next/link";
import { Satellite, Globe2, Camera, ArrowRight, MapPin, Layers } from "lucide-react";
import { getSatellite, INCIDENT_AOIS } from "@/lib/satellite";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Daily satellite imagery archive — UAP incident sites, every day, every sensor",
  description:
    "Free, never-delete archive of daily satellite imagery over every UAP incident location named in the PURSUE files. Sentinel-2 at 10m, MODIS Terra & Aqua at 250m, VIIRS at 375m, NASA Earth Observatory Image of the Day, full-disc daily true-color mosaic. Multi-sensor time-scrubber per location per day.",
  keywords: [
    "UAP satellite imagery",
    "UFO incident sites satellite",
    "NASA Earth Observatory mirror",
    "Sentinel-2 free archive",
    "daily satellite imagery free",
    "MODIS VIIRS UAP",
    "Lake Huron Sandia Hormuz satellite",
  ],
  alternates: { canonical: "/satellite" },
  openGraph: {
    type: "website",
    title: "Daily satellite imagery over every UAP incident site",
    description: "Free, multi-sensor satellite archive of every named UAP incident location in the PURSUE files.",
    url: absoluteUrl("/satellite"),
    siteName: SITE_NAME,
  },
};

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export default function SatellitePage() {
  const sat = getSatellite();

  // Group incident-days by AOI for the index
  const byAoi = new Map<string, typeof sat.incidentDays>();
  for (const d of sat.incidentDays) {
    if (!byAoi.has(d.aoi_id)) byAoi.set(d.aoi_id, []);
    byAoi.get(d.aoi_id)!.push(d);
  }

  const latestIotd = sat.iotd[0];
  const latestGlobal = sat.global[0];
  const totalCaptures = sat.incidentDays.reduce((sum, d) => sum + d.captures.length, 0);
  const totalBytes = [
    ...sat.iotd.map((e) => e.size_bytes),
    ...sat.global.map((e) => e.size_bytes),
    ...sat.incidentDays.flatMap((d) => d.captures.map((c) => c.size_bytes)),
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
      {/* Hero */}
      <header className="mb-10">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-[var(--accent)] uppercase mb-3">
          <Satellite size={12}/> Daily satellite archive
        </div>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight gradient-text max-w-4xl">
          Every day, every UAP site, every sensor we can pull from.
        </h1>
        <p className="text-[var(--muted)] mt-4 max-w-3xl text-sm md:text-base leading-relaxed">
          Free, public-domain satellite imagery covering every named UAP incident location in the PURSUE files —
          Sandia, Lake Huron, Eglin, Hormuz, Iran, Syria, Iraq, Persian Gulf, Papua New Guinea, and more. Sentinel-2
          at 10 m, MODIS Terra and Aqua at 250 m, VIIRS NOAA-20 and Suomi-NPP at 375 m. Plus NASA Earth Observatory&apos;s
          curated Image of the Day, and a daily full-disc true-color mosaic of Earth. Never-delete archive: every
          capture stays forever on our object storage.
        </p>
        <div className="flex flex-wrap gap-2 mt-5 text-xs">
          <Stat label="Incident sites" value={INCIDENT_AOIS.length} />
          <Stat label="Capture days indexed" value={sat.incidentDays.length} />
          <Stat label="Total captures" value={totalCaptures} />
          <Stat label="IOTD images" value={sat.iotd.length} />
          <Stat label="Archive size" value={fmtBytes(totalBytes)} />
          <Stat label="Cost to you" value="$0.00" />
        </div>
      </header>

      {/* Latest IOTD + global */}
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        {latestIotd && (
          <Link href="/satellite/iotd" className="card overflow-hidden group">
            <div className="relative aspect-video bg-black overflow-hidden">
              <img src={latestIotd.image_url} alt={latestIotd.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy"/>
              <div className="absolute top-2 left-2 bg-[var(--bg-0)]/85 backdrop-blur px-2 py-1 rounded text-[10px] tracking-[0.2em] uppercase text-[var(--accent)]">
                NASA · IOTD · {latestIotd.date}
              </div>
            </div>
            <div className="p-4">
              <div className="text-sm font-semibold text-[var(--text)] mb-1 line-clamp-1">{latestIotd.title}</div>
              <div className="text-xs text-[var(--muted)] line-clamp-2">{latestIotd.description}</div>
              <div className="text-[11px] text-[var(--accent-glow)] mt-2 flex items-center gap-1">
                Image of the Day archive <ArrowRight size={11}/>
              </div>
            </div>
          </Link>
        )}
        {latestGlobal && (
          <div className="card overflow-hidden">
            <div className="relative aspect-video bg-black overflow-hidden">
              <img src={latestGlobal.url} alt={`Global VIIRS True Color ${latestGlobal.date}`} className="w-full h-full object-cover" loading="lazy"/>
              <div className="absolute top-2 left-2 bg-[var(--bg-0)]/85 backdrop-blur px-2 py-1 rounded text-[10px] tracking-[0.2em] uppercase text-[var(--accent)]">
                <Globe2 size={10} className="inline mr-1"/> Earth · {latestGlobal.date}
              </div>
            </div>
            <div className="p-4">
              <div className="text-sm font-semibold text-[var(--text)] mb-1">Full-disc true-color mosaic</div>
              <div className="text-xs text-[var(--muted)]">VIIRS NOAA-20 corrected reflectance · 2048×1024 · {fmtBytes(latestGlobal.size_bytes)}</div>
              <div className="text-[11px] text-[var(--muted)] mt-2">{sat.global.length} day{sat.global.length === 1 ? "" : "s"} archived</div>
            </div>
          </div>
        )}
      </div>

      {/* AOI grid */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-2xl font-bold tracking-tight">
            <MapPin size={20} className="inline mr-2 text-[var(--gold)]"/>
            UAP incident sites
          </h2>
          <span className="text-xs text-[var(--muted)]">Click any tile for the daily multi-sensor scrubber</span>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {INCIDENT_AOIS.map((aoi) => {
            const days = byAoi.get(aoi.id) ?? [];
            const latestDay = days[0]; // sorted newest-first by build-manifest
            const preview = latestDay?.captures.find((c) => c.source.includes("Sentinel"))
                          ?? latestDay?.captures.find((c) => c.source.includes("VIIRS"))
                          ?? latestDay?.captures[0];
            return (
              <Link key={aoi.id} href={`/satellite/incident/${aoi.id}`} className="card overflow-hidden group">
                <div className="relative aspect-video bg-black overflow-hidden">
                  {preview ? (
                    <img src={preview.url} alt={`${aoi.name} on ${latestDay?.date}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy"/>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--muted)] text-xs">no captures yet</div>
                  )}
                  <div className="absolute top-2 left-2 bg-[var(--bg-0)]/85 backdrop-blur px-2 py-1 rounded text-[10px] tracking-[0.2em] uppercase text-[var(--accent)]">
                    {aoi.lat.toFixed(2)}°, {aoi.lng.toFixed(2)}°
                  </div>
                  {latestDay && (
                    <div className="absolute bottom-2 right-2 bg-[var(--bg-0)]/85 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-[var(--text)]">
                      {latestDay.captures.length}× · {latestDay.date}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-sm font-semibold text-[var(--text)] mb-1 line-clamp-1">{aoi.name}</div>
                  <div className="text-[11px] text-[var(--muted)] line-clamp-2 leading-relaxed">{aoi.context}</div>
                  <div className="text-[10px] text-[var(--accent-glow)] mt-1.5 flex items-center gap-1">
                    <Layers size={10}/> {days.length} day{days.length === 1 ? "" : "s"} indexed
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Sources */}
      <section className="mb-10">
        <h2 className="text-xl font-bold tracking-tight mb-4">Data sources — all free, all public domain</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <SourceCard
            title="Sentinel-2 (ESA Copernicus)"
            resolution="10 m"
            revisit="~5 days"
            url="https://dataspace.copernicus.eu/"
            note="L2A surface reflectance via Earth-Search STAC on AWS. Best free hi-res available."
          />
          <SourceCard
            title="VIIRS NOAA-20 & Suomi NPP"
            resolution="375 m"
            revisit="daily"
            url="https://nasa-gibs.github.io/gibs-api-docs/"
            note="NASA GIBS WMS — corrected reflectance true color"
          />
          <SourceCard
            title="MODIS Terra & Aqua"
            resolution="250 m"
            revisit="twice daily"
            url="https://nasa-gibs.github.io/gibs-api-docs/"
            note="Two passes per day from the workhorse climate-record sensors"
          />
          <SourceCard
            title="NASA Earth Observatory IOTD"
            resolution="curated"
            revisit="daily"
            url="https://earthobservatory.nasa.gov/images"
            note="NASA's hand-picked daily image with full scientific writeup"
          />
          <SourceCard
            title="GIBS daily global mosaic"
            resolution="~1km/pix"
            revisit="daily"
            url="https://worldview.earthdata.nasa.gov/"
            note="Full-disc VIIRS true color of the entire Earth, every day"
          />
          <SourceCard
            title="More coming"
            resolution="—"
            revisit="—"
            url="#"
            note="GOES-16/18 5-minute geostationary feed, Sentinel-1 SAR (all-weather radar), Landsat 8/9 — coming in v2"
          />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--bg-1)] inline-flex items-center gap-2">
      <span className="text-[var(--muted)] tracking-wider">{label}</span>
      <span className="text-[var(--text)] font-semibold">{value}</span>
    </span>
  );
}

function SourceCard({ title, resolution, revisit, url, note }: { title: string; resolution: string; revisit: string; url: string; note: string }) {
  return (
    <div className="card p-3">
      <div className="text-sm font-semibold text-[var(--text)] mb-1">{title}</div>
      <div className="text-[10px] tracking-widest uppercase text-[var(--accent)] mb-2">
        <span className="text-[var(--gold)]">{resolution}</span> · {revisit}
      </div>
      <p className="text-xs text-[var(--muted)] leading-relaxed mb-2">{note}</p>
      {url !== "#" && (
        <a href={url} target="_blank" rel="noreferrer" className="text-[11px] text-[var(--accent-glow)]">source ↗</a>
      )}
    </div>
  );
}
