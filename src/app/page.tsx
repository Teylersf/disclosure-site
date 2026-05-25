import Link from "next/link";
import { Tv, Search, FileText, Film, ImageIcon, Music, AlertTriangle, ArrowRight } from "lucide-react";
import RecordsExplorer from "@/components/RecordsExplorer";
import { getManifest } from "@/lib/manifest";
import { FINDINGS, TIER1 } from "@/lib/findings";
import FindingCard from "@/components/FindingCard";

export default async function Home() {
  const m = getManifest();

  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-[400px] h-[400px] rounded-full bg-[var(--accent-glow)] opacity-[0.07] blur-3xl" />
          <div className="absolute top-20 right-1/4 w-[300px] h-[300px] rounded-full bg-[var(--gold)] opacity-[0.05] blur-3xl" />
        </div>
        <div className="max-w-[1600px] mx-auto px-6 py-16 relative">
          <div className="text-[11px] tracking-[0.4em] text-[var(--muted)] uppercase mb-4">
            Declassified · Unredacted · 2026
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] gradient-text max-w-4xl">
            The full PURSUE archive,<br/>searchable, viewable, playable.
          </h1>
          <p className="text-[var(--muted)] mt-6 max-w-3xl text-lg leading-relaxed">
            Every record from the U.S. Department of War&apos;s two 2026 UAP releases — {m.totalCount} documents,
            videos, audio recordings, and photographs from FBI, CIA, NASA, ODNI, DoE, and the All-domain
            Anomaly Resolution Office. Mirrored locally, indexed, and ready to explore.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/findings" className="btn btn-gold"><AlertTriangle size={16}/> {FINDINGS.length} findings the catalog doesn&apos;t show</Link>
            <Link href="/tv" className="btn"><Tv size={16}/> TV Mode</Link>
            <Link href="#explore" className="btn btn-primary"><Search size={16}/> Browse the archive</Link>
            <Link href="/bundles" className="btn">Download bundles</Link>
          </div>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-3 max-w-3xl">
            <StatCard icon={<FileText size={20}/>} label="Documents" value={m.byType.PDF} color="var(--pdf)" />
            <StatCard icon={<Film size={20}/>} label="Videos" value={m.byType.VID} color="var(--vid)" />
            <StatCard icon={<Music size={20}/>} label="Audio" value={m.byType.AUD} color="var(--aud)" />
            <StatCard icon={<ImageIcon size={20}/>} label="Images" value={m.byType.IMG} color="var(--img)" />
            <StatCard label="Agencies" value={m.agencies.length} color="var(--accent)" />
          </div>
        </div>
      </section>

      {/* Findings spotlight */}
      <section className="border-b border-[var(--border)] bg-gradient-to-b from-[var(--bg-1)]/30 to-transparent">
        <div className="max-w-[1600px] mx-auto px-6 py-14">
          <div className="flex items-start justify-between mb-8 gap-6">
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-[var(--gold)] mb-3">
                <AlertTriangle size={14}/> {TIER1.length} substantive findings
              </div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight max-w-2xl">
                <span className="text-[var(--text)]">What the official</span>{" "}
                <span style={{ color: "var(--gold)" }}>catalog doesn&apos;t show.</span>
              </h2>
              <p className="text-[var(--muted)] mt-3 max-w-2xl">
                Independent analysis of the released PDFs and DVIDS metadata surfaces {FINDINGS.length} verifiable
                observations the official UI doesn&apos;t expose &mdash; misattributed countries, byte-identical
                duplicates, scrubbing inconsistencies, archive shelfmarks, and one video that wasn&apos;t scrubbed.
              </p>
            </div>
            <Link href="/findings" className="btn btn-gold hidden md:inline-flex">
              All {FINDINGS.length} findings <ArrowRight size={14}/>
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TIER1.slice(0, 3).map((f, i) => (
              <FindingCard key={f.id} finding={f} featured={i === 0} />
            ))}
          </div>
          <div className="text-center mt-6 md:hidden">
            <Link href="/findings" className="btn btn-gold inline-flex">
              All {FINDINGS.length} findings <ArrowRight size={14}/>
            </Link>
          </div>
        </div>
      </section>

      <section id="explore" className="max-w-[1600px] mx-auto px-6 py-10">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Explore the archive</h2>
          <span className="text-sm text-[var(--muted)]">
            {m.byRelease["5/8/26"]} from 5/8 · {m.byRelease["5/22/26"]} from 5/22
          </span>
        </div>
        <RecordsExplorer records={m.records} agencies={m.agencies} />
      </section>
    </>
  );
}

function StatCard({ icon, label, value, color }: { icon?: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[var(--muted)]">
        {icon && <span style={{ color }}>{icon}</span>}
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
