"use client";

import { useState } from "react";
import { Download, Image as ImageIcon, Maximize2 } from "lucide-react";
import type { UapRecord } from "@/lib/types";
import { assetUrl } from "@/lib/asset-url";
import ExifPanel from "./ExifPanel";

export default function RecordViewer({ record }: { record: UapRecord }) {
  const [showExif, setShowExif] = useState(false);
  const isVideo = record.type === "VID" || record.type === "AUD";
  const isImage = record.type === "IMG";
  const isPdf = record.type === "PDF";

  // The "primary" playable/viewable asset
  const primary = isVideo
    ? record.dvids?.files?.[0]?.src
      ? assetUrl(record.dvids.files[0].src)
      : assetUrl(record.asset?.url)
    : assetUrl(record.asset?.url);

  const thumb = assetUrl(record.thumbnail?.url);
  const captions = record.dvids?.closed_captions?.webvtt
    ? `/api/captions?id=${record.dvidsId}&fmt=vtt`
    : undefined;

  return (
    <div className="space-y-4">
      <div className="bg-[var(--bg-1)] border border-[var(--border)] rounded-lg overflow-hidden glow-ring">
        {isVideo && primary && (
          <video
            controls
            preload="metadata"
            poster={thumb || undefined}
            className="w-full aspect-video bg-black"
            playsInline
          >
            <source src={primary} type={record.type === "AUD" ? "video/mp4" : "video/mp4"} />
            {captions && <track kind="captions" srcLang="en" label="English" src={captions} default />}
          </video>
        )}
        {isImage && primary && (
          <a href={primary} target="_blank" rel="noreferrer" className="block">
            <img src={primary} alt={record.imageAlt ?? record.title} className="w-full max-h-[80vh] object-contain bg-black" />
          </a>
        )}
        {isPdf && primary && (
          <iframe
            src={primary}
            className="w-full h-[85vh] bg-black"
            title={record.title}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {primary && (
          <a href={primary} download className="btn btn-primary">
            <Download size={14}/> Download {record.type === "VID" ? "MP4" : record.type === "AUD" ? "audio" : record.type === "PDF" ? "PDF" : "image"}
          </a>
        )}
        {primary && (
          <a href={primary} target="_blank" rel="noreferrer" className="btn">
            <Maximize2 size={14}/> Open in new tab
          </a>
        )}
        {thumb && (
          <button type="button" onClick={() => setShowExif(!showExif)} className="btn">
            <ImageIcon size={14}/> {showExif ? "Hide" : "Show"} EXIF
          </button>
        )}
      </div>

      {showExif && thumb && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3 text-[var(--accent)]">EXIF metadata</h3>
          <ExifPanel src={thumb} />
        </div>
      )}
    </div>
  );
}
