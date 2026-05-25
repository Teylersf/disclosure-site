import { Download, FileArchive } from "lucide-react";
import { assetUrl } from "@/lib/asset-url";

export const metadata = { title: "Bundles — Disclosure" };

const BUNDLES = [
  {
    name: "Release 1 (complete)",
    key: "www.war.gov/medialink/ufo/bundle/Release_1.zip",
    size: "1.22 GB",
    desc: "All 158 records from the initial May 8, 2026 release — PDFs, videos, images, and the lone audio record packaged together.",
    date: "2026-05-08",
  },
  {
    name: "Release 2 (videos + audio + new PDFs)",
    key: "d34w7g4gy10iej.cloudfront.net/uap052226.zip",
    size: "5.64 GB",
    desc: "Everything new in the May 22, 2026 release: 51 videos, 7 NASA Apollo audio tapes, and 6 newly-declassified PDFs (CIA, ODNI, DoE Sandia/Pajarito/Pantex).",
    date: "2026-05-22",
  },
  {
    name: "Release 2 documents only",
    key: "www.war.gov/medialink/ufo/052226/release_02/release_02_document_bundle.zip",
    size: "70 MB",
    desc: "Just the 6 PDFs from the May 22 release. Lightweight if you only want the new written records.",
    date: "2026-05-22",
  },
  {
    name: "Release 1 videos",
    key: "d34w7g4gy10iej.cloudfront.net/uapvideos.zip",
    size: "1.33 GB",
    desc: "All 27 videos and 1 audio track from the initial release, bundled separately.",
    date: "2026-05-08",
  },
];

export default function BundlesPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-1">Bundles</h1>
      <p className="text-[var(--muted)] mb-8">
        One-shot downloads of the full releases, published directly by the Department of War.
        Use these if you want everything at once without browsing record-by-record.
      </p>
      <div className="space-y-4">
        {BUNDLES.map((b) => (
          <div key={b.key} className="card p-6 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-md bg-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)]">
              <FileArchive size={24}/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-widest text-[var(--muted)]">{b.date}</div>
              <h2 className="text-lg font-semibold text-[var(--text)] mt-1">{b.name}</h2>
              <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">{b.desc}</p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-2">
              <span className="text-xs text-[var(--muted)] font-mono">{b.size}</span>
              <a href={assetUrl(b.key)} download className="btn btn-primary">
                <Download size={14}/> Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
