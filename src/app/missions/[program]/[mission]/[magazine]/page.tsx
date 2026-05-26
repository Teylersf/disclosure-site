import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getTothemoon, getGallery, getMissionGalleries, type Program } from "@/lib/tothemoon";
import { absoluteUrl } from "@/lib/site";
import GalleryViewer from "@/components/GalleryViewer";

const PROGRAMS: Program[] = ["Apollo", "Gemini", "Mercury"];
const COLORS: Record<Program, string> = { Apollo: "var(--gold)", Gemini: "var(--vid)", Mercury: "var(--img)" };

export function generateStaticParams() {
  const m = getTothemoon();
  return m.galleries.map((g) => ({
    program: g.program.toLowerCase(),
    mission: String(g.mission_num),
    magazine: g.magazine,
  }));
}

function programFromSlug(slug: string): Program | null {
  const map: Record<string, Program> = { apollo: "Apollo", gemini: "Gemini", mercury: "Mercury" };
  return map[slug.toLowerCase()] ?? null;
}

export async function generateMetadata({
  params,
}: { params: Promise<{ program: string; mission: string; magazine: string }> }): Promise<Metadata> {
  const { program, mission, magazine } = await params;
  const p = programFromSlug(program);
  if (!p) return { title: "Not found" };
  const g = getGallery(p, parseInt(mission, 10), magazine);
  if (!g) return { title: "Gallery not found" };
  const title = `${p} ${g.mission_num} · Magazine ${g.magazine}`;
  const desc = `${g.imageCount} photographs from ${p} ${g.mission_num}, magazine ${g.magazine}. Hasselblad / Maurer / 16mm DAC imagery digitized by NASA Johnson Space Center.`;
  return {
    title,
    description: desc,
    keywords: [`${p} ${g.mission_num}`, `${p} ${g.mission_num} magazine ${g.magazine}`, "NASA Hasselblad", `AS${String(g.mission_num).padStart(2, "0")}-${g.magazine}`],
    alternates: { canonical: `/missions/${program.toLowerCase()}/${mission}/${magazine}` },
    openGraph: { type: "website", title, description: desc, url: absoluteUrl(`/missions/${program.toLowerCase()}/${mission}/${magazine}`) },
  };
}

export default async function GalleryPage({
  params,
}: { params: Promise<{ program: string; mission: string; magazine: string }> }) {
  const { program, mission, magazine } = await params;
  const p = programFromSlug(program);
  if (!p) notFound();
  const missionNum = parseInt(mission, 10);
  const g = getGallery(p, missionNum, magazine);
  if (!g) notFound();

  const siblings = getMissionGalleries(p, missionNum);
  const color = COLORS[p];

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link href={`/missions/${program.toLowerCase()}`} className="btn"><ArrowLeft size={14}/> All {p} missions</Link>
        {siblings.length > 1 && (
          <div className="flex gap-1 flex-wrap">
            <span className="text-xs text-[var(--muted)] mr-2 self-center">Other magazines:</span>
            {siblings.filter((s) => s.magazine !== g.magazine).map((s) => (
              <Link key={s.magazine} href={`/missions/${program.toLowerCase()}/${missionNum}/${s.magazine}`} className="btn text-xs">
                Mag {s.magazine}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.3em] mb-1" style={{ color }}>{p} · Mission {missionNum} · Magazine {g.magazine}</div>
        <h1 className="text-3xl md:text-5xl font-bold" style={{ color }}>{p} {missionNum}</h1>
        <p className="text-[var(--muted)] mt-2">
          {g.imageCount} photographs · Magazine {g.magazine}
        </p>
      </div>

      <GalleryViewer gallery={g} />
    </div>
  );
}
