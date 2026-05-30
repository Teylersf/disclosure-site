import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar, ExternalLink } from "lucide-react";
import { getSatellite } from "@/lib/satellite";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "NASA Earth Observatory · Image of the Day archive",
  description:
    "Daily mirror of NASA Earth Observatory's Image of the Day. Hand-picked satellite imagery from MODIS, VIIRS, Landsat, ISS, and more — every day, with the full scientific writeup, archived forever, served free of charge.",
  alternates: { canonical: "/satellite/iotd" },
  openGraph: {
    type: "website",
    title: "Earth Observatory Image of the Day archive",
    description: "Daily mirror of NASA EO IOTD, never-delete archive.",
    url: absoluteUrl("/satellite/iotd"),
    siteName: SITE_NAME,
  },
};

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

export default function IotdPage() {
  const sat = getSatellite();
  const entries = sat.iotd;

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
      <Link href="/satellite" className="text-xs text-[var(--accent-glow)] inline-flex items-center gap-1 mb-3">
        <ArrowLeft size={12}/> Satellite archive
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-[var(--accent)] uppercase mb-2">
          <Calendar size={12}/> NASA Earth Observatory
        </div>
        <h1 className="text-3xl md:text-4xl font-bold gradient-text">Image of the Day archive</h1>
        <p className="text-[var(--muted)] mt-3 max-w-3xl text-sm leading-relaxed">
          NASA hand-picks one image per day from the world&apos;s satellite firehose and writes up the science behind it.
          We mirror them all here, full-resolution, never deleted. {entries.length} day{entries.length === 1 ? "" : "s"} archived.
        </p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.map((e) => (
          <article key={e.date} className="card overflow-hidden">
            <div className="relative bg-black overflow-hidden">
              <img src={e.image_url} alt={e.title} className="w-full h-auto block" loading="lazy"/>
              <div className="absolute top-2 left-2 bg-[var(--bg-0)]/85 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-[var(--accent)]">
                {e.date}
              </div>
            </div>
            <div className="p-4">
              <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-1">{fmtDate(e.date)}</div>
              <h3 className="text-base font-semibold text-[var(--text)] leading-snug mb-2">{e.title}</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-3">{e.description}</p>
              <div className="flex items-center justify-between mt-3 text-[11px]">
                <a href={e.link} target="_blank" rel="noreferrer" className="text-[var(--accent-glow)] inline-flex items-center gap-1">
                  Full writeup at NASA <ExternalLink size={10}/>
                </a>
                <a href={e.image_url} download className="text-[var(--muted)]">Download</a>
              </div>
            </div>
          </article>
        ))}
      </div>

      {entries.length === 0 && (
        <div className="card p-10 text-center text-[var(--muted)]">
          No entries archived yet — the daily fetcher runs in the morning UTC.
        </div>
      )}
    </div>
  );
}
