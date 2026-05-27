import Link from "next/link";
import { Tv, Search, FileText, Film, ImageIcon, Music, AlertTriangle, ArrowRight, Cpu, Eye, Ruler, Layers, Camera, Activity, Pin, MousePointer2 } from "lucide-react";
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
            <Link href="/analyze" className="btn"><Cpu size={16}/> Video Analysis Lab</Link>
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

      {/* Video Analysis Lab spotlight */}
      <section className="border-b border-[var(--border)] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/3 w-[500px] h-[300px] rounded-full bg-[var(--accent-glow)] opacity-[0.05] blur-3xl" />
        </div>
        <div className="max-w-[1600px] mx-auto px-6 py-14 relative">
          <div className="flex items-start justify-between mb-8 gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-[var(--accent)] mb-3">
                <Cpu size={14}/> Forensic-grade browser tools
              </div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight max-w-3xl">
                <span className="gradient-text">Frame-step every PURSUE video.</span>{" "}
                <span className="text-[var(--text)]">No upload. No server. No install.</span>
              </h2>
              <p className="text-[var(--muted)] mt-3 max-w-3xl">
                The Video Analysis Lab runs entirely in your browser. Pixel data never leaves your machine —
                everything from edge detection to histogram math happens on the canvas in front of you.
                Built for serious forensic review of the {m.byType.VID} videos in the PURSUE release.
              </p>
            </div>
            <Link href="/analyze" className="btn btn-primary self-start whitespace-nowrap">
              Open the lab <ArrowRight size={14}/>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <FeatureCard
              icon={<Film size={18}/>}
              title="Frame-by-frame"
              desc="Step one frame at a time with , and .  Slow to 0.1× or scrub a single-frame A↔B loop to inspect a moment over and over."
            />
            <FeatureCard
              icon={<Eye size={18}/>}
              title="Edge detection"
              desc="Real-time Sobel operator highlights every contour. Crank up contrast, isolate a single channel, or watch the frame-difference map light up motion."
            />
            <FeatureCard
              icon={<Ruler size={18}/>}
              title="16× pixel zoom"
              desc="Zoom in to individual pixels with pixel-perfect rendering — no smoothing. Pan freely, snap-back with 0."
            />
            <FeatureCard
              icon={<Activity size={18}/>}
              title="RGB histogram"
              desc="Live R/G/B distribution for the current frame. Spot crushed blacks, blown highlights, and color-cast tells."
            />
            <FeatureCard
              icon={<Layers size={18}/>}
              title="Channel isolation"
              desc="View red, green, blue, or luminance in isolation. Forensic-grade hue/saturation/blur/grayscale/invert on top."
            />
            <FeatureCard
              icon={<MousePointer2 size={18}/>}
              title="Color picker"
              desc="Click any pixel to read its exact RGB and hex value with the eyedropper tool."
            />
            <FeatureCard
              icon={<Pin size={18}/>}
              title="Annotation pins"
              desc="Drop labelled pins on anything interesting. Pins persist over zoom/pan and bake into screenshots."
            />
            <FeatureCard
              icon={<Camera size={18}/>}
              title="PNG screenshots"
              desc="One keystroke (s) exports the current view — filters, zoom, pins, and all — as a timestamped PNG."
            />
          </div>

          <div className="mt-6 text-xs text-[var(--muted)] flex flex-wrap gap-x-4 gap-y-1">
            <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-1)] border border-[var(--border)] text-[var(--text)]">space</kbd> play/pause</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-1)] border border-[var(--border)] text-[var(--text)]">,</kbd> <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-1)] border border-[var(--border)] text-[var(--text)]">.</kbd> step frame</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-1)] border border-[var(--border)] text-[var(--text)]">-</kbd> <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-1)] border border-[var(--border)] text-[var(--text)]">=</kbd> zoom</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-1)] border border-[var(--border)] text-[var(--text)]">e</kbd> edges</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-1)] border border-[var(--border)] text-[var(--text)]">d</kbd> frame-diff</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-1)] border border-[var(--border)] text-[var(--text)]">b</kbd> <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-1)] border border-[var(--border)] text-[var(--text)]">n</kbd> loop A/B</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-1)] border border-[var(--border)] text-[var(--text)]">s</kbd> screenshot</span>
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

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card p-4 hover:border-[var(--accent)] transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[var(--accent)]">{icon}</span>
        <span className="text-sm font-semibold tracking-wide text-[var(--text)]">{title}</span>
      </div>
      <p className="text-xs text-[var(--muted)] leading-relaxed">{desc}</p>
    </div>
  );
}
