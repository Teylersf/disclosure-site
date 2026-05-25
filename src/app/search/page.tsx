import RecordsExplorer from "@/components/RecordsExplorer";
import { getManifest } from "@/lib/manifest";

export const metadata = { title: "Search — Disclosure" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const m = getManifest();
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-1">Search</h1>
      <p className="text-[var(--muted)] mb-6">Full-text across title, description, agency, and location for all {m.totalCount} records.</p>
      <RecordsExplorer records={m.records} agencies={m.agencies} initialQuery={sp.q ?? ""} />
    </div>
  );
}
