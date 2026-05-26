import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { getTothemoon, getProgramGalleries, programDescription, type Program } from "@/lib/tothemoon";
import { assetUrl } from "@/lib/asset-url";
import { absoluteUrl } from "@/lib/site";

const PROGRAMS: Program[] = ["Apollo", "Gemini", "Mercury"];
const COLORS: Record<Program, string> = { Apollo: "var(--gold)", Gemini: "var(--vid)", Mercury: "var(--img)" };

export function generateStaticParams() {
  return PROGRAMS.map((p) => ({ program: p.toLowerCase() }));
}

function programFromSlug(slug: string): Program | null {
  const map: Record<string, Program> = { apollo: "Apollo", gemini: "Gemini", mercury: "Mercury" };
  return map[slug.toLowerCase()] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ program: string }> }): Promise<Metadata> {
  const { program: slug } = await params;
  const p = programFromSlug(slug);
  if (!p) return { title: "Program not found" };
  const m = getTothemoon();
  const bp = m.byProgram[p];
  const desc = `${bp.images.toLocaleString()} declassified photographs from ${p} missions ${bp.missions.join(", ")}. ${programDescription(p)}`;
  return {
    title: `${p} program — every mission, every magazine`,
    description: desc,
    keywords: [`${p} photographs`, `${p} Hasselblad`, `${p} mission images`, `NASA ${p} archive`],
    alternates: { canonical: `/missions/${slug.toLowerCase()}` },
    openGraph: { type: "website", title: `${p} program`, description: desc, url: absoluteUrl(`/missions/${slug.toLowerCase()}`) },
  };
}

export default async function ProgramPage({ params }: { params: Promise<{ program: string }> }) {
  const { program: slug } = await params;
  const p = programFromSlug(slug);
  if (!p) notFound();

  const m = getTothemoon();
  const bp = m.byProgram[p];
  const galleries = getProgramGalleries(p);

  // Group galleries by mission_num
  const byMission = new Map<number, typeof galleries>();
  for (const g of galleries) {
    if (!byMission.has(g.mission_num)) byMission.set(g.mission_num, []);
    byMission.get(g.mission_num)!.push(g);
  }
  const missions = Array.from(byMission.keys()).sort((a, b) => a - b);
  const color = COLORS[p];

  return (
    <div>
      <section className="border-b border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto px-6 py-10">
          <Link href="/missions" className="btn mb-4 inline-flex"><ArrowLeft size={14}/> All programs</Link>
          <h1 className="text-4xl md:text-6xl font-bold" style={{ color }}>{p}</h1>
          <p className="text-[var(--muted)] mt-3 max-w-3xl leading-relaxed">{programDescription(p)}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="chip" style={{ background: `${color}25`, color }}>{missions.length} missions</span>
            <span className="chip" style={{ background: `${color}25`, color }}>{bp.galleries} magazines</span>
            <span className="chip" style={{ background: `${color}25`, color }}>{bp.images.toLocaleString()} images</span>
          </div>
        </div>
      </section>

      <section className="max-w-[1600px] mx-auto px-6 py-10">
        <div className="space-y-6">
          {missions.map((num) => {
            const mGalleries = byMission.get(num)!;
            const totalImages = mGalleries.reduce((s, g) => s + g.imageCount, 0);
            const hero = mGalleries[0].images.find((i) => i.thumb_image)?.thumb_image;
            const heroUrl = hero ? assetUrl(`tothemoon.im-ldi.com${hero}`) : undefined;

            return (
              <div key={num} className="card overflow-hidden">
                <div className="grid md:grid-cols-[200px_1fr] gap-0">
                  <div className="aspect-square md:aspect-auto bg-[var(--bg-0)] relative overflow-hidden">
                    {heroUrl && <img src={heroUrl} alt={`${p} ${num}`} loading="lazy" className="w-full h-full object-cover"/>}
                  </div>
                  <div className="p-5">
                    <div className="flex items-baseline justify-between mb-1">
                      <h2 className="text-2xl font-bold" style={{ color }}>{p} {num}</h2>
                      <span className="text-xs text-[var(--muted)]">
                        {mGalleries.length} {mGalleries.length === 1 ? "magazine" : "magazines"} · {totalImages.toLocaleString()} images
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {mGalleries.map((g) => (
                        <Link
                          key={g.magazine}
                          href={`/missions/${p.toLowerCase()}/${num}/${g.magazine}`}
                          className="card p-3 flex items-center gap-2 hover:border-[var(--accent)] flex-shrink-0"
                        >
                          <ImageIcon size={14} style={{ color }}/>
                          <span className="text-xs">
                            <span className="text-[var(--text)] font-semibold">Magazine {g.magazine}</span>
                            <span className="text-[var(--muted)] ml-2">{g.imageCount} images</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
