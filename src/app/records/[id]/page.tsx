import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Building2, Calendar, MapPin, FileText, Hash, Clock, AlertTriangle, ArrowUpRight } from "lucide-react";
import { getManifest, getRecord, getAllRecordIds } from "@/lib/manifest";
import { findingsForRecord } from "@/lib/findings";
import { assetUrl } from "@/lib/asset-url";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";
import RecordViewer from "@/components/RecordViewer";
import JsonLd from "@/components/JsonLd";

export function generateStaticParams() {
  return getAllRecordIds().map((id) => ({ id }));
}

const TYPE_LABEL: Record<string, string> = {
  PDF: "document",
  VID: "video",
  IMG: "photograph",
  AUD: "audio recording",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const record = getRecord(id);
  if (!record) return { title: "Record not found" };

  const typeLabel = TYPE_LABEL[record.type] ?? "record";
  const where = [record.incidentLocation, record.incidentDate].filter((x) => x && x !== "N/A").join(" · ");
  const desc = `${record.agency || "Department of War"} ${typeLabel}${where ? ` — ${where}` : ""}. ${record.description.slice(0, 200)}${record.description.length > 200 ? "…" : ""}`;

  // Prefer the record's own thumbnail as OG image; fall back to the auto-generated
  // /opengraph-image route from app/opengraph-image.tsx
  const ogImage = record.thumbnail?.url
    ? assetUrl(record.thumbnail.url).startsWith("http")
      ? assetUrl(record.thumbnail.url)
      : `${SITE_URL}${assetUrl(record.thumbnail.url)}`
    : `${SITE_URL}/opengraph-image`;

  return {
    title: record.title,
    description: desc,
    keywords: [
      record.title,
      record.agency,
      record.incidentLocation,
      "PURSUE 2026",
      "DOW-UAP",
      record.dvidsId ? `DVIDS ${record.dvidsId}` : "",
      record.type === "VID" ? "UAP video" : "",
      record.type === "PDF" ? "declassified UAP document" : "",
      record.type === "AUD" ? "NASA UAP audio" : "",
    ].filter(Boolean) as string[],
    alternates: { canonical: `/records/${id}` },
    openGraph: {
      type: "article",
      title: record.title,
      description: desc,
      url: absoluteUrl(`/records/${id}`),
      siteName: SITE_NAME,
      images: [{ url: ogImage, width: 1200, height: 630, alt: record.imageAlt ?? record.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: record.title,
      description: desc,
      images: [ogImage],
    },
  };
}

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = getRecord(id);
  if (!record) notFound();

  const m = getManifest();
  const idx = m.records.findIndex((r) => r.id === id);
  const prev = idx > 0 ? m.records[idx - 1] : null;
  const next = idx < m.records.length - 1 ? m.records[idx + 1] : null;

  const isNew = record.release === "release_2";
  const findings = findingsForRecord(id);

  // JSON-LD structured data
  const typeMap: Record<string, string> = { PDF: "DigitalDocument", VID: "VideoObject", AUD: "AudioObject", IMG: "ImageObject" };
  const sdType = typeMap[record.type] ?? "CreativeWork";
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": sdType,
    name: record.title,
    description: record.description,
    url: absoluteUrl(`/records/${id}`),
    dateCreated: record.incidentDate,
    datePublished: record.releaseDate,
    inLanguage: "en",
    isAccessibleForFree: true,
    isFamilyFriendly: true,
    keywords: [record.agency, record.incidentLocation, "PURSUE 2026", "DOW-UAP", record.dvidsId].filter(Boolean).join(", "),
    publisher: { "@type": "Organization", name: record.agency || "U.S. Department of War" },
    sourceOrganization: { "@type": "Organization", name: record.agency || "U.S. Department of War", url: "https://www.war.gov/UFO/" },
    contentLocation: record.incidentLocation && record.incidentLocation !== "N/A" ? { "@type": "Place", name: record.incidentLocation } : undefined,
  };
  if (record.type === "VID" && record.dvids) {
    const f0 = record.dvids.files?.[0];
    Object.assign(jsonLd, {
      duration: record.dvids.duration ? `PT${Math.floor(record.dvids.duration)}S` : undefined,
      thumbnailUrl: record.thumbnail?.url ? assetUrl(record.thumbnail.url) : undefined,
      contentUrl: f0 ? assetUrl(f0.src) : undefined,
      uploadDate: record.dvids.date_published,
      width: f0?.width,
      height: f0?.height,
    });
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Records", item: `${SITE_URL}/#explore` },
      { "@type": "ListItem", position: 3, name: record.title, item: absoluteUrl(`/records/${id}`) },
    ],
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumb} />
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="btn"><ArrowLeft size={14}/> Back to archive</Link>
        <div className="flex gap-2">
          {prev && <Link href={`/records/${prev.id}`} className="btn">← Previous</Link>}
          {next && <Link href={`/records/${next.id}`} className="btn">Next →</Link>}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className={`chip chip-${record.type}`}>{record.type}</span>
            {isNew && <span className="chip" style={{ background: "var(--gold)", color: "var(--bg-0)" }}>NEW · 5/22/26</span>}
            {record.redacted && <span className="chip" style={{ background: "var(--pdf)", color: "white" }}>REDACTED</span>}
            <span className="text-xs text-[var(--muted)]">{record.id}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold leading-tight text-[var(--text)] mb-3">
            {record.title}
          </h1>

          {record.description && (
            <p className="text-[var(--muted)] text-base leading-relaxed mb-6 whitespace-pre-line">
              {record.description}
            </p>
          )}

          {findings.length > 0 && (
            <div className="mb-6 space-y-2">
              {findings.map((f) => (
                <Link
                  key={f.id}
                  href={`/findings/${f.id}`}
                  className="card p-4 flex items-start gap-3 group"
                  style={{ borderColor: "var(--gold)" }}
                >
                  <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" style={{ color: "var(--gold)" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-1" style={{ color: "var(--gold)" }}>
                      Referenced in finding · {f.id}
                    </div>
                    <div className="text-[15px] font-semibold text-[var(--text)] group-hover:text-[var(--accent-glow)] transition">
                      {f.title}
                    </div>
                    <div className="text-[12px] text-[var(--muted)] mt-1 line-clamp-2">{f.claim}</div>
                  </div>
                  <ArrowUpRight size={16} className="text-[var(--muted)] group-hover:text-[var(--accent-glow)] transition flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}

          <RecordViewer record={record} />
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <h2 className="text-xs uppercase tracking-wider text-[var(--accent)] mb-3">Metadata</h2>
            <dl className="space-y-3 text-sm">
              <MetaRow icon={<Building2 size={14}/>} label="Agency" value={record.agency} />
              <MetaRow icon={<Calendar size={14}/>} label="Incident date" value={record.incidentDate} />
              <MetaRow icon={<MapPin size={14}/>} label="Location" value={record.incidentLocation} />
              <MetaRow icon={<FileText size={14}/>} label="Released" value={record.releaseDate} />
              {record.imageVirin && (
                <MetaRow icon={<Hash size={14}/>} label="VIRIN" value={record.imageVirin} />
              )}
              {record.dvidsId && (
                <MetaRow icon={<Hash size={14}/>} label="DVIDS ID" value={record.dvidsId} />
              )}
              {record.dvids?.duration ? (
                <MetaRow icon={<Clock size={14}/>} label="Duration" value={formatDuration(record.dvids.duration)} />
              ) : null}
            </dl>
          </div>

          {record.dvids && record.dvids.files && record.dvids.files.length > 1 && (
            <div className="card p-4">
              <h2 className="text-xs uppercase tracking-wider text-[var(--accent)] mb-3">Other quality variants</h2>
              <ul className="space-y-1 text-sm">
                {record.dvids.files.slice(1).map((f, i) => (
                  <li key={i} className="flex justify-between text-[12px] text-[var(--muted)]">
                    <span>{f.width}×{f.height}</span>
                    <span>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-[var(--muted)] mt-2">Highest quality is shown above; other variants are listed for reference (not mirrored).</p>
            </div>
          )}

          {record.imageAlt && (
            <div className="card p-4">
              <h2 className="text-xs uppercase tracking-wider text-[var(--accent)] mb-2">Image description</h2>
              <p className="text-[13px] text-[var(--muted)]">{record.imageAlt}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  if (!value || value === "N/A" || value === "—") {
    return (
      <div className="flex items-baseline gap-2">
        <span className="text-[var(--muted)]">{icon}</span>
        <span className="text-[11px] uppercase tracking-wider text-[var(--muted)] w-20">{label}</span>
        <span className="text-[var(--muted)] text-sm">—</span>
      </div>
    );
  }
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[var(--accent)] mt-0.5">{icon}</span>
      <span className="text-[11px] uppercase tracking-wider text-[var(--muted)] w-20">{label}</span>
      <span className="text-[var(--text)] text-sm flex-1">{value}</span>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
