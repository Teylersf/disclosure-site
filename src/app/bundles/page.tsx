import type { Metadata } from "next";
import { Download, FileArchive } from "lucide-react";
import { assetUrl } from "@/lib/asset-url";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Download bundles — PURSUE 2026 UAP files (all 4 releases)",
  description:
    "Download every official Department of War PURSUE 2026 release bundle as one-shot ZIP files — Release 1 (1.22 GB), Release 2 combined (5.64 GB), Release 2 documents only (70 MB), Release 1 videos (1.33 GB), Release 3 documents (826 MB), Release 3 videos (4.6 GB), Release 4 documents, and Release 4 videos.",
  keywords: [
    "PURSUE 2026 download",
    "war.gov UFO zip",
    "uap052226.zip",
    "uap_videos_061226.zip",
    "release_03_documents.zip",
    "release_04_documents_071026.zip",
    "uap_release04_videos_071026.zip",
    "uapvideos.zip",
    "Release_1.zip UFO",
    "Pentagon UAP bulk download",
  ],
  alternates: { canonical: "/bundles" },
  openGraph: {
    title: "Download the full PURSUE 2026 bundles",
    description: "Every official Department of War ZIP bundle across all four releases — declassified UAP files including STS-80 Space Shuttle images and the East Coast 2019-2020 wave.",
    url: absoluteUrl("/bundles"),
  },
};

const BUNDLES = [
  {
    name: "Release 4 videos",
    key: "d34w7g4gy10iej.cloudfront.net/release_04/uap_release04_videos_071026.zip",
    size: "~2 GB",
    desc: "All 19 videos and 4 audio recordings from the July 10, 2026 release — includes eight previously-undisclosed 2019-2020 East Coast wave sensor clips, four Apollo 14/17 medical debriefings on the \"light flash phenomena,\" plus fresh Yellow Sea / East China Sea / South China Sea CENTCOM-adjacent footage.",
    date: "2026-07-10",
  },
  {
    name: "Release 4 documents",
    key: "www.war.gov/medialink/ufo/071026/release_04/release_04_documents_071026.zip",
    size: "~250 MB",
    desc: "All 14 PDFs and 3 images from the July 10, 2026 release — includes the three NASA STS-80 Space Shuttle Columbia UFO images (Nov 1996), the 1948 Project Sign Progress Report, 1955 CIA memoranda on Unconventional Aircraft Sightings, the 1949 Los Alamos Conference on Aerial Phenomena, and DoW analyses of Flying Object Incidents in the US from 1948-1949.",
    date: "2026-07-10",
  },
  {
    name: "Release 3 videos",
    key: "d34w7g4gy10iej.cloudfront.net/release_03/uap_videos_061226.zip",
    size: "4.6 GB",
    desc: "All 6 videos and 3 audio tracks from the June 12, 2026 release — including the 1962 Walter Cronkite × Gordon Cooper interview, the Apollo 16 Scientific Debriefings, Gemini-era audio tracks, and the FBI digital recreations of the Western US Event narratives.",
    date: "2026-06-12",
  },
  {
    name: "Release 3 documents",
    key: "www.war.gov/medialink/ufo/061226/release_03/release_03_documents.zip",
    size: "826 MB",
    desc: "All 53 PDFs and 10 images from the June 12, 2026 release — including 18 CIA Cold War UFO files (Robertson Panel, U-2/OXCART history, Kardashev & Sakharov), the Western US Event cluster (21 docs), the Colorado Springs incident (FBI + ICA), and the 1949 J. Edgar Hoover correspondence with Rev. Charles Barnes.",
    date: "2026-06-12",
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
    name: "Release 1 (complete)",
    key: "www.war.gov/medialink/ufo/bundle/Release_1.zip",
    size: "1.22 GB",
    desc: "All 158 records from the initial May 8, 2026 release — PDFs, videos, images, and the lone audio record packaged together.",
    date: "2026-05-08",
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
