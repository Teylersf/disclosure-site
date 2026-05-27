import Link from "next/link";
import type { Metadata } from "next";
import { Clock, TrendingDown, TrendingUp, Minus, Image as ImageIcon, Download, ArrowRight } from "lucide-react";
import { getTimeline, formatBytes, shortFilename } from "@/lib/timeline";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Timeline — every version of every PURSUE file we've captured",
  description:
    "Versioned history of every PDF and asset in the war.gov/UFO/ PURSUE archive. The government has silently re-issued files; we keep every version we've ever captured and link to all of them, by date.",
  alternates: { canonical: "/timeline" },
  keywords: [
    "PURSUE version history",
    "war.gov UFO file timeline",
    "DOW-UAP changed files",
    "PURSUE archive provenance",
    "PURSUE before and after",
  ],
  openGraph: {
    type: "website",
    title: "PURSUE archive timeline — never delete, always archive",
    description: "Every captured version of every file in the war.gov UAP release. Keep one. Keep all.",
    url: absoluteUrl("/timeline"),
    siteName: SITE_NAME,
  },
};

const KIND_COLOR: Record<string, string> = {
  "size-smaller": "var(--vid)",
  "size-larger": "var(--gold)",
  "size-similar": "var(--accent)",
  "thumbnail-only": "var(--img)",
};

const KIND_ICON: Record<string, React.ReactNode> = {
  "size-smaller": <TrendingDown size={14}/>,
  "size-larger": <TrendingUp size={14}/>,
  "size-similar": <Minus size={14}/>,
  "thumbnail-only": <ImageIcon size={14}/>,
};

const KIND_LABEL: Record<string, string> = {
  "size-smaller": "re-compressed (smaller)",
  "size-larger": "re-OCR'd / expanded",
  "size-similar": "minor edit",
  "thumbnail-only": "thumbnail re-rendered",
};

export default function TimelinePage() {
  const t = getTimeline();
  return (
    <div>
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-12 left-1/3 w-[500px] h-[500px] rounded-full bg-[var(--accent-glow)] opacity-[0.06] blur-3xl" />
          <div className="absolute top-32 right-1/4 w-[300px] h-[300px] rounded-full bg-[var(--gold)] opacity-[0.05] blur-3xl" />
        </div>
        <div className="max-w-[1600px] mx-auto px-6 py-16 relative">
          <div className="flex items-center gap-2 text-[11px] tracking-[0.4em] text-[var(--accent)] uppercase mb-4">
            <Clock size={14}/> Never delete · Always archive
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] max-w-5xl">
            <span className="gradient-text">Every version</span><br/>
            <span className="text-[var(--text)]">of every file we&apos;ve captured.</span>
          </h1>
          <p className="text-[var(--muted)] mt-6 max-w-3xl text-lg leading-relaxed">
            The government silently re-issues files on war.gov/UFO/. We keep what they replace.
            Every file below has at least one prior version saved to our Linode archive at a stable URL —
            so anyone can verify what the document said yesterday, last week, or last month.
          </p>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
            <Stat n={t.totalFilesChanged} l="files changed" c="var(--accent-glow)" />
            <Stat label="net delta" big={`${(t.totalSizeChange.deltaBytes / 1024 / 1024).toFixed(0)} MB`} c="var(--pdf)" />
            <Stat n={t.captureDates.length} l="snapshots captured" c="var(--gold)" />
            <Stat n={t.entries.reduce((s, e) => s + e.versions.length, 0)} l="total file-versions stored" c="var(--vid)" />
          </div>
          <div className="mt-8 flex flex-wrap gap-2 text-xs">
            {Object.entries(t.breakdown).map(([k, n]) => (
              <span key={k} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border" style={{ borderColor: `${KIND_COLOR[k]}55`, background: `${KIND_COLOR[k]}11`, color: KIND_COLOR[k] }}>
                {KIND_ICON[k]} {n} {KIND_LABEL[k]}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-[1600px] mx-auto px-6 py-10">
        <h2 className="text-xs uppercase tracking-[0.3em] text-[var(--accent)] mb-4">Changed files — sorted by absolute delta</h2>
        <div className="space-y-2">
          {t.entries.map((e) => (
            <div key={e.key} className="card p-4 grid md:grid-cols-[1fr_auto] gap-3 items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded font-bold" style={{ background: `${KIND_COLOR[e.changeKind]}25`, color: KIND_COLOR[e.changeKind] }}>
                    {KIND_ICON[e.changeKind]} {KIND_LABEL[e.changeKind]}
                  </span>
                  <span className="text-[11px] text-[var(--muted)] font-mono">{e.versions.length} version{e.versions.length === 1 ? "" : "s"}</span>
                </div>
                <div className="text-sm font-semibold text-[var(--text)] truncate">{shortFilename(e.key)}</div>
                <div className="text-[11px] text-[var(--muted)] truncate font-mono">{e.key}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {e.versions.map((v) => (
                  <a key={v.capturedAt + v.md5} href={v.publicUrl} target="_blank" rel="noopener noreferrer" className="card p-2.5 flex items-center gap-2 hover:border-[var(--accent)]" title={`md5: ${v.md5}`}>
                    <Download size={14} className="text-[var(--accent)]"/>
                    <div className="text-xs">
                      <div className="text-[var(--text)] font-semibold">{v.capturedAt}</div>
                      <div className="text-[var(--muted)] font-mono">{formatBytes(v.size)}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-[1600px] mx-auto px-6 pb-16">
        <div className="card p-6 flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-shrink-0 w-12 h-12 rounded-md bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)]">
            <Clock size={24}/>
          </div>
          <div className="flex-1 text-sm text-[var(--muted)] leading-relaxed">
            <strong className="text-[var(--text)]">Policy:</strong> never delete, always archive. When a file
            on war.gov changes, our uploader copies the previous bucket version to <code className="bg-[var(--bg-2)] px-1.5 rounded">archive/&lt;capture-date&gt;/</code> before
            overwriting. Every URL in this timeline is a permanent reference. If a future capture detects
            another change, this page will grow another row of versions.
          </div>
          <Link href="/findings/may-27-silent-republish" className="btn btn-gold flex-shrink-0">
            Read the finding <ArrowRight size={14}/>
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ n, l, label, big, c }: { n?: number; l?: string; label?: string; big?: string; c: string }) {
  return (
    <div className="card p-4">
      <div className="text-3xl md:text-4xl font-bold" style={{ color: c }}>{big ?? (n ?? 0).toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mt-1">{l ?? label}</div>
    </div>
  );
}
