import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, FileWarning, Wrench, Microscope } from "lucide-react";
import { FINDINGS, TIER1, TIER2, TIER3 } from "@/lib/findings";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";
import FindingCard from "@/components/FindingCard";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Findings — what the PURSUE catalog doesn’t say",
  description:
    "13 verifiable observations about the U.S. Department of War PURSUE 2026 UAP release that the official catalog UI does not surface. Embedded PDF titles disagreeing with catalog entries, byte-identical duplicates, scrubbing inconsistencies (PR-073 Columbus OH), archive shelfmarks (NARA RG decoded), and server-hygiene leftovers.",
  keywords: [
    "PURSUE 2026 findings",
    "DOW-UAP discrepancy",
    "DOW-UAP-D20 Iraq Southern United States",
    "PURSUE PR-073 Columbus Ohio Edward Pajak",
    "D to PR relabel crosswalk",
    "Kazakhstan Tajikistan UAP Cable",
    "war.gov UFO PDF metadata leak",
    "NARA shelfmark UAP",
  ],
  alternates: { canonical: "/findings" },
  openGraph: {
    type: "website",
    title: "13 findings the PURSUE catalog doesn’t show",
    description: "Independent analysis of the PURSUE 2026 release. Each claim links to the file in the mirror — verify it yourself.",
    url: absoluteUrl("/findings"),
    siteName: SITE_NAME,
    // Image auto-supplied by app/opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title: "13 findings the PURSUE catalog doesn’t show",
    description: "Verifiable observations about the PURSUE 2026 UAP release.",
  },
};

export default function FindingsPage() {
  const lead = TIER1[0]; // d20-location-swap — most impactful
  const rest1 = TIER1.slice(1);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "PURSUE 2026 findings",
    description: "Independent observations about the U.S. Department of War PURSUE 2026 UAP release.",
    numberOfItems: FINDINGS.length,
    itemListElement: FINDINGS.map((f, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/findings/${f.id}`),
      name: f.title,
      description: f.claim,
    })),
  };

  return (
    <div>
      <JsonLd data={itemListJsonLd} />
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/3 w-[500px] h-[500px] rounded-full bg-[var(--gold)] opacity-[0.07] blur-3xl" />
          <div className="absolute top-32 right-1/4 w-[300px] h-[300px] rounded-full bg-[var(--pdf)] opacity-[0.06] blur-3xl" />
        </div>
        <div className="max-w-[1600px] mx-auto px-6 py-16 relative">
          <div className="flex items-center gap-2 text-[11px] tracking-[0.4em] text-[var(--gold)] uppercase mb-4">
            <AlertTriangle size={14} className="text-[var(--gold)]" />
            {FINDINGS.length} findings · {TIER1.length} substantive
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] max-w-5xl">
            <span className="gradient-text">What the catalog</span><br/>
            <span className="text-[var(--text)]">doesn&apos;t tell you.</span>
          </h1>
          <p className="text-[var(--muted)] mt-6 max-w-3xl text-lg leading-relaxed">
            Independent analysis of the released PDFs, DVIDS JSON metadata, and the live HTML.
            Every claim links back to the underlying file in the mirror, with md5 hashes where relevant,
            so you can verify each one yourself. None of this is leaked — it&apos;s observable in the files
            the government published.
          </p>
          <div className="mt-8 flex flex-wrap gap-2 text-xs">
            <Tag color="var(--gold)" label={`${TIER1.length} Tier 1 — substantive`} icon={<AlertTriangle size={12}/>} />
            <Tag color="var(--accent)" label={`${TIER2.length} Tier 2 — server hygiene`} icon={<Wrench size={12}/>} />
            <Tag color="var(--aud)" label={`${TIER3.length} Tier 3 — tradecraft & curios`} icon={<Microscope size={12}/>} />
          </div>
        </div>
      </section>

      {/* Lead finding — full width */}
      {lead && (
        <section className="max-w-[1600px] mx-auto px-6 py-12">
          <div className="text-[10px] uppercase tracking-[0.4em] text-[var(--gold)] mb-3 flex items-center gap-2">
            <span className="inline-block w-8 h-px bg-[var(--gold)]"/> Lead finding
          </div>
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 items-stretch">
            <FindingCard finding={lead} featured />
            <div className="card p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-xs uppercase tracking-widest text-[var(--accent)] mb-3">Why this one matters</h3>
                <p className="text-[var(--text)] text-lg leading-relaxed mb-6">{lead.significance}</p>
                {lead.comparisons?.[0] && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="bg-[var(--bg-2)] rounded p-4 border-l-2 border-[var(--vid)]">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--vid)] mb-1">{lead.comparisons[0].leftLabel}</div>
                      <div className="text-sm text-[var(--text)] font-mono">{lead.comparisons[0].leftValue}</div>
                    </div>
                    <div className="bg-[var(--bg-2)] rounded p-4 border-l-2 border-[var(--pdf)]">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--pdf)] mb-1">{lead.comparisons[0].rightLabel}</div>
                      <div className="text-sm text-[var(--text)] font-mono">{lead.comparisons[0].rightValue}</div>
                    </div>
                  </div>
                )}
              </div>
              <Link href={`/findings/${lead.id}`} className="btn btn-gold self-start mt-4">
                Read the full finding →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Tier 1 remainder */}
      <section className="max-w-[1600px] mx-auto px-6 py-8">
        <SectionHeader
          number="01"
          color="var(--gold)"
          title="Substantive discrepancies"
          subtitle="Facts about the released data — not speculation. Each is verifiable from a file in the mirror."
          icon={<AlertTriangle size={16}/>}
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rest1.map((f) => <FindingCard key={f.id} finding={f} />)}
        </div>
      </section>

      {/* Tier 2 */}
      <section className="max-w-[1600px] mx-auto px-6 py-8">
        <SectionHeader
          number="02"
          color="var(--accent)"
          title="Server-hygiene leftovers"
          subtitle="Files and assets still publicly served but no longer referenced by the live page. The pattern itself is the finding."
          icon={<FileWarning size={16}/>}
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIER2.map((f) => <FindingCard key={f.id} finding={f} />)}
        </div>
      </section>

      {/* Tier 3 */}
      <section className="max-w-[1600px] mx-auto px-6 py-8 mb-16">
        <SectionHeader
          number="03"
          color="var(--aud)"
          title="Tradecraft &amp; curios"
          subtitle="Producer fingerprints, country distributions, and HTML curios — colour and context for the release."
          icon={<Microscope size={16}/>}
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIER3.map((f) => <FindingCard key={f.id} finding={f} />)}
        </div>
      </section>
    </div>
  );
}

function Tag({ color, label, icon }: { color: string; label: string; icon?: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
      style={{ borderColor: `${color}55`, background: `${color}11`, color }}
    >
      {icon}
      {label}
    </span>
  );
}

function SectionHeader({ number, color, title, subtitle, icon }: { number: string; color: string; title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-6 border-b border-[var(--border)] pb-4">
      <div className="flex items-center gap-4">
        <span className="text-5xl font-bold opacity-30" style={{ color }}>{number}</span>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2" style={{ color }}>{icon}{title}</h2>
          <p className="text-sm text-[var(--muted)] mt-1 max-w-2xl">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
