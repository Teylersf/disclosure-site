import type { Metadata } from "next";
import RecordsExplorer from "@/components/RecordsExplorer";
import { getManifest } from "@/lib/manifest";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Search the PURSUE 2026 UAP archive",
  description:
    "Full-text search across all 222 declassified records from the U.S. Department of War PURSUE 2026 UAP file release. Filter by type (PDF, video, audio, image), agency, release date, and location.",
  keywords: [
    "PURSUE 2026 search",
    "search declassified UFO files",
    "war.gov UFO search",
    "DOW-UAP search",
    "FBI UFO files search",
    "NASA UAP search",
  ],
  alternates: { canonical: "/search" },
  openGraph: {
    title: "Search the PURSUE 2026 UAP archive",
    description: "Full-text search across 222 declassified records.",
    url: absoluteUrl("/search"),
  },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const m = getManifest();
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-1">Search the PURSUE 2026 archive</h1>
      <p className="text-[var(--muted)] mb-6">
        Full-text across title, description, agency, and location for all {m.totalCount} records.
        Filter by type, agency, and release date.
      </p>
      <RecordsExplorer records={m.records} agencies={m.agencies} initialQuery={sp.q ?? ""} />
    </div>
  );
}
