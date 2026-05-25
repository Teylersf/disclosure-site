import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, AlertTriangle, FileWarning, Microscope, Hash, FileText,
  Link2, ExternalLink,
} from "lucide-react";
import { getFinding, getAllFindingIds, FINDINGS } from "@/lib/findings";
import { getRecord } from "@/lib/manifest";
import { assetUrl } from "@/lib/asset-url";
import FindingEvidenceText from "@/components/FindingEvidenceText";

export function generateStaticParams() {
  return getAllFindingIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = getFinding(id);
  if (!f) return { title: "Finding not found" };
  return {
    title: `${f.title} — Finding ${f.id}`,
    description: f.claim,
  };
}

const TIER_COLOR: Record<number, string> = { 1: "var(--gold)", 2: "var(--accent)", 3: "var(--aud)" };
const TIER_LABEL: Record<number, string> = { 1: "Tier 1", 2: "Tier 2", 3: "Tier 3" };
const TIER_ICON: Record<number, React.ReactNode> = {
  1: <AlertTriangle size={14}/>,
  2: <FileWarning size={14}/>,
  3: <Microscope size={14}/>,
};

export default async function FindingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = getFinding(id);
  if (!f) notFound();

  const color = TIER_COLOR[f.tier];
  const idx = FINDINGS.findIndex((x) => x.id === id);
  const prev = idx > 0 ? FINDINGS[idx - 1] : null;
  const next = idx < FINDINGS.length - 1 ? FINDINGS[idx + 1] : null;
  const relatedRecords = (f.relatedRecordIds ?? []).map((rid) => getRecord(rid)).filter(Boolean);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link href="/findings" className="btn"><ArrowLeft size={14}/> All findings</Link>
        <div className="flex gap-2 text-xs">
          {prev && <Link href={`/findings/${prev.id}`} className="btn">← {prev.id}</Link>}
          {next && <Link href={`/findings/${next.id}`} className="btn">{next.id} →</Link>}
        </div>
      </div>

      {/* Header */}
      <header className="mb-10 pb-8 border-b border-[var(--border)]">
        <div className="flex items-center gap-3 mb-4 text-xs">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-bold tracking-[0.15em] uppercase"
            style={{ background: `${color}25`, color }}
          >
            {TIER_ICON[f.tier]} {TIER_LABEL[f.tier]}
          </span>
          <span className="font-mono text-[var(--muted)]">finding · {f.id}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold leading-[1.1] mb-5" style={{ color }}>
          {f.title}
        </h1>
        <p className="text-xl text-[var(--text)] leading-relaxed max-w-4xl">{f.claim}</p>
        <p className="text-base text-[var(--muted)] mt-4 leading-relaxed max-w-3xl italic">
          {f.significance}
        </p>
      </header>

      {/* Stats row */}
      {f.stats && f.stats.length > 0 && (
        <section className="mb-10">
          <SectionLabel color={color}>By the numbers</SectionLabel>
          <div className={`grid gap-3 ${f.stats.length <= 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"}`}>
            {f.stats.map((s, i) => (
              <div key={i} className="card p-4 text-center" style={{ borderColor: `${color}55` }}>
                <div className="text-3xl md:text-4xl font-bold leading-none" style={{ color }}>{s.big}</div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mt-2">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Comparisons */}
      {f.comparisons && f.comparisons.length > 0 && (
        <section className="mb-10">
          <SectionLabel color={color}>Side by side</SectionLabel>
          <div className="space-y-3">
            {f.comparisons.map((c, i) => (
              <div key={i} className="grid md:grid-cols-2 gap-3">
                <div className="card p-5 border-l-4" style={{ borderLeftColor: "var(--vid)" }}>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--vid)] mb-2">{c.leftLabel}</div>
                  <div className="text-[15px] text-[var(--text)] font-mono leading-relaxed">{c.leftValue}</div>
                </div>
                <div className="card p-5 border-l-4" style={{ borderLeftColor: "var(--pdf)" }}>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--pdf)] mb-2">{c.rightLabel}</div>
                  <div className="text-[15px] text-[var(--text)] font-mono leading-relaxed">{c.rightValue}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Evidence */}
      <section className="mb-10">
        <SectionLabel color={color}>Evidence</SectionLabel>
        <div className="card p-6">
          <FindingEvidenceText text={f.evidence} />
        </div>
      </section>

      {/* Tables */}
      {f.tables && f.tables.map((t, i) => (
        <section key={i} className="mb-10">
          <SectionLabel color={color}>{t.caption ?? "Mapping"}</SectionLabel>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {t.headers.map((h, j) => (
                    <th key={j} className="text-left p-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((r, j) => (
                  <tr key={j} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-2)]">
                    {r.cells.map((c, k) => (
                      <td key={k} className="p-3 text-[12px] text-[var(--text)] font-mono align-top">{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* Verify yourself (hashes) */}
      {f.hashes && f.hashes.length > 0 && (
        <section className="mb-10">
          <SectionLabel color={color}>Verify it yourself</SectionLabel>
          <div className="card p-5">
            <p className="text-xs text-[var(--muted)] mb-3 flex items-center gap-2">
              <Hash size={12}/> Run <code className="bg-[var(--bg-2)] px-1 rounded">md5sum &lt;file&gt;</code> against the file in your mirror:
            </p>
            <div className="space-y-2 font-mono text-xs">
              {f.hashes.map((h, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-[var(--bg-2)] rounded">
                  <span className="text-[var(--accent-glow)] flex-shrink-0">{h.hash}</span>
                  <span className="text-[var(--muted)] truncate">{h.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sources */}
      <section className="mb-10">
        <SectionLabel color={color}>Sources</SectionLabel>
        <div className="space-y-2">
          {f.sources.map((s, i) => {
            const url = s.path.includes(".csv") || s.path.endsWith(".html") || s.path.endsWith(".css") || s.path.endsWith(".json") || s.path.endsWith(".pdf") || s.path.endsWith(".mp4") || s.path.endsWith(".jpg") || s.path.endsWith(".png")
              ? assetUrl(s.path)
              : null;
            const isFile = Boolean(url);
            return (
              <div key={i} className="card p-3 flex items-start gap-3">
                <FileText size={14} className="mt-1 flex-shrink-0" style={{ color }} />
                <div className="flex-1 min-w-0">
                  {isFile && url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-glow)] font-mono text-[12px] break-all hover:underline">
                      {s.path}
                    </a>
                  ) : (
                    <span className="text-[var(--muted)] font-mono text-[12px] break-all">{s.path}</span>
                  )}
                  {s.note && <div className="text-[11px] text-[var(--muted)] mt-1">{s.note}</div>}
                </div>
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="btn flex-shrink-0">
                    <ExternalLink size={12}/> Open
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Related records */}
      {relatedRecords.length > 0 && (
        <section className="mb-10">
          <SectionLabel color={color}>Records referenced by this finding</SectionLabel>
          <div className="grid md:grid-cols-2 gap-3">
            {relatedRecords.map((r) => r && (
              <Link key={r.id} href={`/records/${r.id}`} className="card p-4 flex items-center gap-3 hover:border-[var(--accent)]">
                <div className="w-[80px] h-[50px] bg-black rounded overflow-hidden flex-shrink-0">
                  {r.thumbnail?.url && <img src={assetUrl(r.thumbnail.url)} alt="" className="w-full h-full object-cover"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`chip chip-${r.type}`}>{r.type}</span>
                    <span className="text-[10px] text-[var(--muted)]">{r.agency}</span>
                  </div>
                  <div className="text-sm font-semibold text-[var(--text)] truncate">{r.title}</div>
                </div>
                <Link2 size={14} className="text-[var(--muted)]"/>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionLabel({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-px" style={{ background: color }} />
      <h2 className="text-xs uppercase tracking-[0.3em] font-semibold" style={{ color }}>{children}</h2>
      <div className="flex-1 h-px bg-[var(--border)]" />
    </div>
  );
}
