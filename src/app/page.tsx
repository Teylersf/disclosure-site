import Link from "next/link";
import { Tv, Search, FileText, Film, ImageIcon, Music, AlertTriangle, ArrowRight, Cpu, Eye, Ruler, Layers, Camera, Activity, Pin, MousePointer2, Globe2 } from "lucide-react";
import RecordsExplorer from "@/components/RecordsExplorer";
import { getManifest } from "@/lib/manifest";
import { FINDINGS, TIER1 } from "@/lib/findings";
import FindingCard from "@/components/FindingCard";
import { assetUrl } from "@/lib/asset-url";

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
            Every record from the U.S. Department of War&apos;s five 2026 UAP releases — {m.totalCount} documents,
            videos, audio recordings, and photographs from FBI, CIA, NASA, ODNI, DoE, State, EOP, ICA, and the All-domain
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

      {/* Featured article — R5: linked Gulf of Oman video set */}
      <section className="border-b border-[var(--border)] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-[600px] h-[400px] rounded-full bg-[var(--img)] opacity-[0.06] blur-3xl" />
        </div>
        <div className="max-w-[1600px] mx-auto px-6 py-14 relative">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-[var(--gold)] mb-6">
            <AlertTriangle size={14}/> Featured · Just released · Fifth PURSUE tranche · August 7, 2026
          </div>
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8 items-stretch">
            {/* Cover / thumbnail */}
            <Link
              href="/findings/gulf-of-oman-six-part-set"
              className="card block relative overflow-hidden group"
              aria-label="Open the full finding on the linked Gulf of Oman video set"
            >
              <div className="aspect-[4/5] bg-[var(--bg-0)] relative">
                <img
                  src={assetUrl("www.war.gov/medialink/ufo/release_05/Aug_07/thumbnails/DOW-UAP-D101_IIR_Unresolved-UAP-Report-Gulf-of-Oman_2021.jpg")}
                  alt="Cover thumbnail for the Release 05 Gulf of Oman Intelligence Information Report"
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--gold)] mb-1">DOW-UAP-D101 / PR117–PR122</div>
                  <div className="text-sm text-white font-mono">Gulf of Oman · Sep 2021 · 1 report + 6 linked clips</div>
                </div>
              </div>
            </Link>

            {/* Editorial copy */}
            <div className="flex flex-col">
              <h2 className="text-3xl md:text-5xl font-bold leading-[1.08] text-[var(--text)]">
                Release 05&apos;s Gulf of Oman videos are
                <br/>
                <span className="gradient-text">one linked evidence set, not six isolated files.</span>
              </h2>
              <p className="text-[var(--muted)] mt-5 text-lg leading-relaxed max-w-3xl">
                The August 7 catalog ties one Intelligence Information Report —
                <span className="font-mono text-[var(--gold)]"> DOW-UAP-D101</span> — directly to six clips,
                <span className="font-mono text-[var(--gold)]"> PR117–PR122</span>. Their DVIDS descriptions say
                the clips were captured contemporaneously as secondary recordings of an AC-130J sensor display;
                PR121 and PR122 explicitly overlap. The catalog presents six playable records, but the source metadata
                supplies the shared provenance.
              </p>

              {/* Quote pull */}
              <blockquote className="mt-6 border-l-2 border-[var(--gold)] pl-5 py-2 text-[var(--text)] text-base italic max-w-3xl">
                “This footage does not represent native primary sensor data, and the secondary recording method
                introduces limitations in fidelity, resolution, and overall visual quality.”
                <footer className="not-italic text-[11px] uppercase tracking-widest text-[var(--muted)] mt-2">
                  — DVIDS description for the linked Gulf of Oman set
                </footer>
              </blockquote>

              {/* Quick facts */}
              <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <FactCell label="Release" value="Aug 7, 2026" />
                <FactCell label="Linked clips" value="6 (PR117–PR122)" />
                <FactCell label="Incident" value="Sep 8, 2021" />
                <FactCell label="Source" value="Secondary capture" />
              </div>

              <p className="text-[var(--muted)] mt-7 max-w-3xl leading-relaxed">
                Release 05 adds <strong className="text-[var(--text)]">41 records</strong> — bringing the PURSUE archive
                to 375. It includes 22 PDFs, three FBI image records, and 16 videos: a five-part Pacific Ocean 2019
                group, four Middle East clips, FBI&apos;s 2026 &ldquo;Slow-moving Objects&rdquo; reconstruction, historical DoW files,
                CIA Puerto Rico briefing material, and State Department Bahia correspondence.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/findings/gulf-of-oman-six-part-set" className="btn btn-gold inline-flex">
                  <ArrowRight size={14}/> Read the linked-set finding
                </Link>
                <Link href="/findings/pacific-2019-altered-source" className="btn inline-flex">
                  <FileText size={14}/> Pacific 2019 provenance
                </Link>
                <Link href="/bundles" className="btn inline-flex">
                  <Globe2 size={14}/> Release 05 bundles
                </Link>
              </div>
            </div>
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
                observations the official UI doesn&apos;t expose &mdash; an Apollo&nbsp;16 timecode pointing at the
                phrase &ldquo;could be an alien starbase,&rdquo; a 1962 Cronkite&nbsp;×&nbsp;Gordon&nbsp;Cooper UFO
                interview, AARO calling the Colorado Springs UAP an &ldquo;angular, non-symmetrical potato,&rdquo;
                misattributed countries, byte-identical duplicates, archive shelfmarks, and the one video that
                wasn&apos;t scrubbed.
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
            {m.byRelease["5/8/26"]} from 5/8 · {m.byRelease["5/22/26"]} from 5/22 · {m.byRelease["6/12/26"]} from 6/12 · {m.byRelease["7/10/26"]} from 7/10 · {m.byRelease["8/7/26"]} from 8/7
          </span>
        </div>
        <RecordsExplorer records={m.records} agencies={m.agencies} />
      </section>
    </>
  );
}

function FactCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">{label}</div>
      <div className="text-sm font-semibold text-[var(--text)] mt-1 font-mono">{value}</div>
    </div>
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
