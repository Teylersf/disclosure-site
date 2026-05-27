import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { getMissionGalleries, getTothemoon, type Program, imageUrl } from "@/lib/tothemoon";
import { absoluteUrl } from "@/lib/site";

const PROGRAMS: Program[] = ["Apollo", "Gemini", "Mercury"];
const COLORS: Record<Program, string> = { Apollo: "var(--gold)", Gemini: "var(--vid)", Mercury: "var(--img)" };

function programFromSlug(slug: string): Program | null {
  const map: Record<string, Program> = { apollo: "Apollo", gemini: "Gemini", mercury: "Mercury" };
  return map[slug.toLowerCase()] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ program: string; mission: string }> }): Promise<Metadata> {
  const { program, mission } = await params;
  const p = programFromSlug(program);
  if (!p) return { title: "Not found" };
  const n = parseInt(mission, 10);
  const galleries = getMissionGalleries(p, n);
  const total = galleries.reduce((s, g) => s + g.imageCount, 0);
  return {
    title: `${p} ${n} — ${galleries.length} magazines, ${total.toLocaleString()} photographs`,
    description: `Every photo magazine from ${p} ${n}. ${total.toLocaleString()} digitized photographs across ${galleries.length} Hasselblad / Maurer film magazines.`,
    alternates: { canonical: `/missions/${program.toLowerCase()}/${mission}` },
    openGraph: {
      title: `${p} ${n}`,
      description: `${galleries.length} magazines, ${total.toLocaleString()} photographs.`,
      url: absoluteUrl(`/missions/${program.toLowerCase()}/${mission}`),
    },
  };
}

export function generateStaticParams() {
  // Pre-render one page per program × mission so RSC prefetching of
  // /missions/<program>/<mission> doesn't 404 on hover.
  const seen = new Set<string>();
  const params: { program: string; mission: string }[] = [];
  for (const g of getTothemoon().galleries) {
    const key = `${g.program.toLowerCase()}-${g.mission_num}`;
    if (seen.has(key)) continue;
    seen.add(key);
    params.push({ program: g.program.toLowerCase(), mission: String(g.mission_num) });
  }
  return params;
}

export default async function MissionPage({ params }: { params: Promise<{ program: string; mission: string }> }) {
  const { program, mission } = await params;
  const p = programFromSlug(program);
  if (!p) notFound();
  const n = parseInt(mission, 10);
  if (!Number.isFinite(n)) notFound();

  const galleries = getMissionGalleries(p, n);
  if (galleries.length === 0) notFound();

  // If there's only one magazine, jump straight to it.
  if (galleries.length === 1) {
    redirect(`/missions/${program.toLowerCase()}/${mission}/${galleries[0].magazine}`);
  }

  const color = COLORS[p];
  const total = galleries.reduce((s, g) => s + g.imageCount, 0);

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-10">
      <Link href={`/missions/${program.toLowerCase()}`} className="btn mb-6 inline-flex"><ArrowLeft size={14}/> All {p} missions</Link>

      <header className="mb-8">
        <div className="text-xs uppercase tracking-[0.3em] mb-1" style={{ color }}>{p} program · Mission {n}</div>
        <h1 className="text-4xl md:text-6xl font-bold" style={{ color }}>{p} {n}</h1>
        <p className="text-[var(--muted)] mt-3">
          {galleries.length} photo magazines · {total.toLocaleString()} photographs
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {galleries.map((g) => {
          const hero = imageUrl(g.images.find((i) => i.thumb_image)?.thumb_image);
          return (
            <Link
              key={g.magazine}
              href={`/missions/${program.toLowerCase()}/${mission}/${g.magazine}`}
              className="card block overflow-hidden hover:border-[var(--accent)] group"
            >
              <div className="aspect-video bg-black relative overflow-hidden">
                {hero && <img src={hero} alt={`${p} ${n} Magazine ${g.magazine}`} loading="lazy" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"/>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"/>
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Magazine {g.magazine}</span>
                  <span className="text-[10px] tracking-wider uppercase font-mono text-white/80">{g.imageCount} imgs</span>
                </div>
              </div>
              <div className="p-3 flex items-center gap-2 text-xs text-[var(--muted)]">
                <ImageIcon size={12} style={{ color }} />
                Browse {g.imageCount} photos
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
