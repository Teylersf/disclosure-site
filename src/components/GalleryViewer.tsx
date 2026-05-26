"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Maximize, Download, ExternalLink } from "lucide-react";
import type { Gallery, MissionImage } from "@/lib/tothemoon";
import { assetUrl } from "@/lib/asset-url";

function imageHref(relPath: string | null | undefined): string {
  if (!relPath) return "#";
  const clean = relPath.startsWith("/") ? relPath.slice(1) : relPath;
  return assetUrl(`tothemoon.im-ldi.com/${clean}`);
}

function pickUrl(img: MissionImage, ...candidates: (keyof MissionImage)[]): string | undefined {
  for (const k of candidates) {
    const v = img[k];
    if (typeof v === "string" && v) return imageHref(v);
  }
  return undefined;
}

export default function GalleryViewer({ gallery }: { gallery: Gallery }) {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const images = gallery.images;
  const current = images[idx];

  const prev = useCallback(() => setIdx((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.code === "ArrowRight" || e.code === "Space") { e.preventDefault(); next(); }
      else if (e.code === "ArrowLeft") prev();
      else if (e.code === "Escape" && lightbox) setLightbox(false);
      else if (e.code === "KeyF") setLightbox((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, lightbox]);

  const mainUrl = current ? pickUrl(current, "med_image", "small_image") : undefined;
  const lightboxUrl = current ? pickUrl(current, "full_image", "med_image") ?? mainUrl : undefined;
  const thumbStripStart = Math.max(0, idx - 6);
  const thumbStripEnd = Math.min(images.length, idx + 7);
  const thumbStrip = useMemo(() => images.slice(thumbStripStart, thumbStripEnd), [images, thumbStripStart, thumbStripEnd]);

  if (!current) return null;

  return (
    <div className="space-y-4">
      {/* Main image area */}
      <div className="card overflow-hidden bg-black">
        <div className="relative aspect-[4/3] md:aspect-[16/10] flex items-center justify-center">
          {mainUrl && (
            <img
              key={current.image_id}
              src={mainUrl}
              alt={current.subject ?? current.image_id}
              loading="eager"
              className="max-w-full max-h-full object-contain"
            />
          )}
          <button type="button" onClick={prev} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-2 md:p-3 backdrop-blur" aria-label="Previous image">
            <ChevronLeft size={20} className="text-white"/>
          </button>
          <button type="button" onClick={next} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-2 md:p-3 backdrop-blur" aria-label="Next image">
            <ChevronRight size={20} className="text-white"/>
          </button>
          <button type="button" onClick={() => setLightbox(true)} className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/60 hover:bg-black/80 rounded p-2 backdrop-blur" title="Fullscreen (F)" aria-label="Fullscreen">
            <Maximize size={16} className="text-white"/>
          </button>
          <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 bg-black/70 backdrop-blur-sm rounded px-3 py-1.5 text-xs text-white font-mono">
            {idx + 1} / {images.length}
          </div>
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="card p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {thumbStrip.map((img, i) => {
            const realIdx = thumbStripStart + i;
            const t = pickUrl(img, "thumb_image", "small_image");
            return (
              <button
                type="button"
                key={img.image_id}
                onClick={() => setIdx(realIdx)}
                className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded overflow-hidden border-2 transition ${realIdx === idx ? "border-[var(--accent-glow)]" : "border-transparent opacity-60 hover:opacity-100"}`}
                title={img.image_id}
              >
                {t && <img src={t} alt="" loading="lazy" className="w-full h-full object-cover"/>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Metadata + actions */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="card p-4">
          <h2 className="text-sm uppercase tracking-wider text-[var(--accent)] mb-3">Image metadata</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <MetaRow label="Image ID" value={current.image_id} mono />
            <MetaRow label="Subject" value={current.subject} />
            <MetaRow label="Camera" value={current.camera_name} />
            <MetaRow label="Lens" value={current.lens} />
            <MetaRow label="Film" value={current.film_type} />
            <MetaRow label="Magazine" value={current.magazine} />
            <MetaRow label="Date" value={current.date} />
            <MetaRow label="Latitude" value={current.latitude} mono />
            <MetaRow label="Longitude" value={current.longitude} mono />
          </dl>
        </div>
        <div className="card p-4 space-y-2">
          <h2 className="text-sm uppercase tracking-wider text-[var(--accent)] mb-2">Downloads</h2>
          {current.med_image && (
            <a href={imageHref(current.med_image)} target="_blank" rel="noopener noreferrer" className="btn w-full justify-center">
              <Download size={14}/> Medium PNG
            </a>
          )}
          {current.full_image && (
            <a href={imageHref(current.full_image)} target="_blank" rel="noopener noreferrer" className="btn w-full justify-center">
              <Download size={14}/> Large PNG
            </a>
          )}
          {current.raw_image && (
            <a href={imageHref(current.raw_image)} target="_blank" rel="noopener noreferrer" className="btn w-full justify-center">
              <Download size={14}/> Raw TIFF
            </a>
          )}
          <a href={`https://tothemoon.im-ldi.com/gallery/${gallery.program}/${gallery.mission_num}/${gallery.magazine}#${current.image_id}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full justify-center mt-3">
            <ExternalLink size={14}/> View on March to the Moon
          </a>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setLightbox(false)}>
          {lightboxUrl && (
            <img src={lightboxUrl} alt={current.subject ?? current.image_id} className="max-w-full max-h-full object-contain" />
          )}
          <button type="button" onClick={(e) => { e.stopPropagation(); setLightbox(false); }} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 backdrop-blur" aria-label="Close fullscreen">
            <X size={20} className="text-white"/>
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded text-white text-sm">
            {current.image_id} · {idx + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <span className={`text-[var(--text)] ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
