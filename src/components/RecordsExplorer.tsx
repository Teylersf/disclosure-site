"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { Search, Filter as FilterIcon, X, Sparkles } from "lucide-react";
import type { UapRecord, RecordType } from "@/lib/types";
import { assetUrl } from "@/lib/asset-url";

type Props = {
  records: UapRecord[];
  agencies: string[];
  initialQuery?: string;
};

const TYPES: { value: RecordType | ""; label: string }[] = [
  { value: "", label: "All types" },
  { value: "PDF", label: "Documents" },
  { value: "VID", label: "Videos" },
  { value: "AUD", label: "Audio" },
  { value: "IMG", label: "Images" },
];

const RELEASES: { value: string; label: string }[] = [
  { value: "", label: "All releases" },
  { value: "5/8/26", label: "Release 1 (5/8/26)" },
  { value: "5/22/26", label: "Release 2 (5/22/26)" },
];

export default function RecordsExplorer({ records, agencies, initialQuery = "" }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [type, setType] = useState<string>("");
  const [release, setRelease] = useState<string>("");
  const [agency, setAgency] = useState<string>("");
  const [onlyNew, setOnlyNew] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");

  // Keep URL in sync so links are shareable.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
    if (type) url.searchParams.set("type", type); else url.searchParams.delete("type");
    if (release) url.searchParams.set("release", release); else url.searchParams.delete("release");
    if (agency) url.searchParams.set("agency", agency); else url.searchParams.delete("agency");
    if (onlyNew) url.searchParams.set("new", "1"); else url.searchParams.delete("new");
    window.history.replaceState(null, "", url.toString());
  }, [q, type, release, agency, onlyNew]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return records.filter((r) => {
      if (type && r.type !== type) return false;
      if (release && r.releaseDate !== release) return false;
      if (agency && r.agency !== agency) return false;
      if (onlyNew && r.release !== "release_2") return false;
      if (!needle) return true;
      const hay = `${r.title} ${r.description} ${r.agency} ${r.incidentLocation}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [records, q, type, release, agency, onlyNew]);

  const clearFilters = () => {
    setQ(""); setType(""); setRelease(""); setAgency(""); setOnlyNew(false);
  };

  const hasFilters = q || type || release || agency || onlyNew;

  return (
    <div className="space-y-6">
      {/* Mobile: search on its own row, then 2-col filter grid, then controls.
          Desktop: everything in one wrapping row. */}
      <div className="space-y-3 md:space-y-0 md:flex md:flex-wrap md:items-center md:gap-3">
        <div className="relative md:flex-1 md:min-w-[280px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search title, description, agency, location…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input w-full pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:gap-3 md:items-center">
          <select value={type} onChange={(e) => setType(e.target.value)} className="select min-w-0">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={release} onChange={(e) => setRelease(e.target.value)} className="select min-w-0">
            {RELEASES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select value={agency} onChange={(e) => setAgency(e.target.value)} className="select min-w-0 col-span-2 md:col-span-1">
            <option value="">All agencies</option>
            {agencies.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setOnlyNew(!onlyNew)}
            className={`btn ${onlyNew ? "btn-gold" : ""} justify-center`}
            title="Only show 5/22 release"
          >
            <Sparkles size={14}/> New
          </button>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="btn justify-center">
              <X size={14}/> Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 md:ml-auto text-sm text-[var(--muted)]">
          <span><FilterIcon size={12} className="inline mr-1" />{filtered.length} / {records.length}</span>
          <div className="flex border border-[var(--border)] rounded-md overflow-hidden ml-auto md:ml-0">
            <button type="button" onClick={() => setView("grid")} className={`px-2.5 py-1 text-xs ${view === "grid" ? "bg-[var(--accent)] text-[var(--bg-0)]" : ""}`}>Grid</button>
            <button type="button" onClick={() => setView("list")} className={`px-2.5 py-1 text-xs ${view === "list" ? "bg-[var(--accent)] text-[var(--bg-0)]" : ""}`}>List</button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted)]">No records match these filters.</div>
      ) : view === "grid" ? (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          {filtered.map((r) => <RecordCard key={r.id} record={r} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => <RecordRow key={r.id} record={r} />)}
        </div>
      )}
    </div>
  );
}

function RecordCard({ record }: { record: UapRecord }) {
  const thumb = assetUrl(record.thumbnail?.url);
  const isNew = record.release === "release_2";
  return (
    <Link href={`/records/${record.id}`} className="card block">
      <div className="aspect-video bg-[var(--bg-0)] relative overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={record.imageAlt ?? record.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--muted)] text-xs">No preview</div>
        )}
        <div className="absolute top-2 left-2 flex gap-2">
          <span className={`chip chip-${record.type}`}>{record.type}</span>
          {isNew && <span className="chip" style={{ background: "var(--gold)", color: "var(--bg-0)" }}>NEW</span>}
        </div>
      </div>
      <div className="p-3">
        <div className="text-[13px] font-semibold leading-tight text-[var(--text)] line-clamp-2">{record.title}</div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--muted)]">
          <span>{record.agency || "—"}</span>
          {record.incidentDate && <><span>•</span><span>{record.incidentDate}</span></>}
          {record.incidentLocation && record.incidentLocation !== "N/A" && <><span>•</span><span className="truncate">{record.incidentLocation}</span></>}
        </div>
      </div>
    </Link>
  );
}

function RecordRow({ record }: { record: UapRecord }) {
  const thumb = assetUrl(record.thumbnail?.url);
  const isNew = record.release === "release_2";
  return (
    <Link href={`/records/${record.id}`} className="card flex items-stretch gap-3 p-2 pr-4">
      <div className="w-[120px] h-[80px] flex-shrink-0 bg-[var(--bg-0)] rounded overflow-hidden relative">
        {thumb ? (
          <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : null}
        <span className={`chip chip-${record.type} absolute top-1 left-1`}>{record.type}</span>
      </div>
      <div className="flex-1 min-w-0 py-1">
        <div className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          {isNew && <span className="chip" style={{ background: "var(--gold)", color: "var(--bg-0)" }}>NEW</span>}
          <span className="truncate">{record.title}</span>
        </div>
        <div className="text-[11px] text-[var(--muted)] mt-1 line-clamp-2">{record.description}</div>
        <div className="mt-1 text-[11px] text-[var(--muted)] flex gap-3">
          <span>{record.agency || "—"}</span>
          {record.incidentDate && <span>{record.incidentDate}</span>}
          {record.incidentLocation && record.incidentLocation !== "N/A" && <span>{record.incidentLocation}</span>}
          <span>Released {record.releaseDate}</span>
        </div>
      </div>
    </Link>
  );
}
