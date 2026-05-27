import Link from "next/link";
import type { Metadata } from "next";
import { Rocket, ArrowRight, Image as ImageIcon, Film } from "lucide-react";
import { getTothemoon, type Program, programDescription, imageUrl } from "@/lib/tothemoon";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "NASA Missions — Apollo, Gemini, Mercury photography archive",
  description:
    "25,800+ digitised photographs from every U.S. crewed spaceflight before the Shuttle: Mercury (1958–1963), Gemini (1961–1966), and Apollo (1961–1972). Mirrored from the March to the Moon archive (tothemoon.im-ldi.com).",
  keywords: [
    "Apollo photography archive",
    "Gemini mission photos",
    "Mercury mission photos",
    "NASA crewed spaceflight gallery",
    "Hasselblad 70mm Apollo",
    "Apollo 11 Hasselblad",
    "NASA Johnson Space Center archive",
  ],
  alternates: { canonical: "/missions" },
  openGraph: {
    type: "website",
    title: "NASA Missions — Apollo / Gemini / Mercury photography",
    description: "25,800+ photographs from America's first three crewed spaceflight programs.",
    url: absoluteUrl("/missions"),
    siteName: SITE_NAME,
  },
};

const PROGRAM_THEME: Record<Program, { color: string; years: string }> = {
  Mercury: { color: "var(--img)", years: "1958 – 1963" },
  Gemini: { color: "var(--vid)", years: "1961 – 1966" },
  Apollo: { color: "var(--gold)", years: "1961 – 1972" },
};

export default function MissionsPage() {
  const m = getTothemoon();
  return (
    <div>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-12 left-1/4 w-[500px] h-[500px] rounded-full bg-[var(--gold)] opacity-[0.06] blur-3xl" />
          <div className="absolute top-32 right-1/4 w-[300px] h-[300px] rounded-full bg-[var(--accent-glow)] opacity-[0.06] blur-3xl" />
        </div>
        <div className="max-w-[1600px] mx-auto px-6 py-16 relative">
          <div className="flex items-center gap-2 text-[11px] tracking-[0.4em] text-[var(--accent)] uppercase mb-4">
            <Rocket size={14} /> Apollo · Gemini · Mercury
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] max-w-5xl">
            <span className="gradient-text">{m.totalImages.toLocaleString()} photographs</span><br/>
            <span className="text-[var(--text)]">from America&apos;s first crewed spaceflight programs.</span>
          </h1>
          <p className="text-[var(--muted)] mt-6 max-w-3xl text-lg leading-relaxed">
            Every Hasselblad, every magazine, every step chart from Project Mercury through Apollo 17 —
            mirrored from the &ldquo;March to the Moon&rdquo; digital archive curated by the NASA Johnson
            Space Center and Arizona State University&apos;s School of Earth and Space Exploration.
          </p>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
            <Stat n={m.totalGalleries} l="galleries" c="var(--accent)" />
            <Stat n={m.totalImages} l="images" c="var(--accent-glow)" />
            <Stat n={m.programs.length} l="programs" c="var(--gold)" />
            <Stat n={m.programs.reduce((s, p) => s + m.byProgram[p].missions.length, 0)} l="missions" c="var(--img)" />
          </div>
        </div>
      </section>

      <section className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {m.programs.map((p) => {
            const bp = m.byProgram[p];
            const theme = PROGRAM_THEME[p];
            // Pick a representative image from the first gallery of this program
            const firstGallery = m.galleries.find((g) => g.program === p);
            const heroUrl = imageUrl(firstGallery?.images?.find((i) => i.thumb_image)?.thumb_image);
            return (
              <Link key={p} href={`/missions/${p.toLowerCase()}`} className="card block group overflow-hidden">
                <div className="aspect-[4/3] bg-[var(--bg-0)] relative overflow-hidden">
                  {heroUrl && (
                    <img src={heroUrl} alt={`${p} program`} loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-3 left-3 text-[10px] tracking-[0.3em] uppercase font-bold" style={{ color: theme.color }}>
                    {theme.years}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <h2 className="text-4xl font-bold" style={{ color: theme.color }}>{p}</h2>
                    <div className="text-xs text-white/70 mt-1">
                      {bp.missions.length} missions · {bp.galleries} magazines · {bp.images.toLocaleString()} images
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-[var(--muted)] leading-relaxed line-clamp-3">
                    {programDescription(p)}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: theme.color }}>
                    Browse galleries <ArrowRight size={14}/>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="max-w-[1600px] mx-auto px-6 pb-16">
        <div className="card p-6 flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-shrink-0 w-12 h-12 rounded-md bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)]">
            <ImageIcon size={24}/>
          </div>
          <div className="flex-1 text-sm text-[var(--muted)] leading-relaxed">
            <strong className="text-[var(--text)]">Image source:</strong> photographic metadata and thumbnails are
            mirrored from <a href="https://tothemoon.im-ldi.com/" target="_blank" rel="noopener noreferrer">tothemoon.im-ldi.com</a>{" "}
            (March to the Moon), maintained by NASA Johnson Space Center and ASU SESE. NASA imagery is
            public-domain. For full-resolution TIFF downloads, link out to the original archive.
          </div>
          <Link href="/missions/apollo/11" className="btn btn-gold flex-shrink-0">
            <Film size={14}/> Open Apollo 11
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ n, l, c }: { n: number; l: string; c: string }) {
  return (
    <div className="card p-4">
      <div className="text-3xl md:text-4xl font-bold" style={{ color: c }}>{n.toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mt-1">{l}</div>
    </div>
  );
}
