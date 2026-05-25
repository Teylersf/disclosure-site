import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Finding } from "@/lib/findings";

const TIER_LABEL: Record<number, string> = { 1: "Tier 1", 2: "Tier 2", 3: "Tier 3" };
const TIER_DESC: Record<number, string> = {
  1: "Substantive discrepancy",
  2: "Server-hygiene leftover",
  3: "Tradecraft / curio",
};
const TIER_COLOR: Record<number, string> = {
  1: "var(--gold)",
  2: "var(--accent)",
  3: "var(--aud)",
};

export default function FindingCard({ finding, featured = false }: { finding: Finding; featured?: boolean }) {
  const color = TIER_COLOR[finding.tier];
  return (
    <Link
      href={`/findings/${finding.id}`}
      className="card block p-5 group relative overflow-hidden"
      style={featured ? { borderColor: color } : undefined}
    >
      {featured && (
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ background: `radial-gradient(400px 200px at 20% 0%, ${color}, transparent 60%)` }}
        />
      )}
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-[10px] font-bold tracking-[0.2em] uppercase px-2 py-1 rounded"
            style={{ background: `${color}25`, color }}
          >
            {TIER_LABEL[finding.tier]}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
            {TIER_DESC[finding.tier]}
          </span>
          <ArrowUpRight size={14} className="ml-auto text-[var(--muted)] group-hover:text-[var(--accent-glow)] transition" />
        </div>
        <h3 className={`${featured ? "text-2xl" : "text-lg"} font-bold leading-tight text-[var(--text)] mb-2 group-hover:text-[var(--accent-glow)] transition`}>
          {finding.title}
        </h3>
        <p className="text-sm text-[var(--muted)] leading-relaxed line-clamp-3">
          {finding.claim}
        </p>
        {finding.stats && finding.stats.length > 0 && featured && (
          <div className="flex flex-wrap gap-2 mt-4">
            {finding.stats.slice(0, 4).map((s, i) => (
              <div key={i} className="bg-[var(--bg-2)] rounded px-2.5 py-1.5 border border-[var(--border)]">
                <div className="text-[16px] font-bold" style={{ color }}>{s.big}</div>
                <div className="text-[9px] uppercase tracking-wider text-[var(--muted)]">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
