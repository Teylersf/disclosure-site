"use client";

/**
 * Per-AOI satellite scrubber.
 *
 * Layout:
 *   ┌────────────────────────────────────────────────────────────┐
 *   │  Day picker (newest → oldest, scrubbable timeline)         │
 *   ├────────────────────────────────────────────────────────────┤
 *   │  Source tabs for the selected day  ·  view options          │
 *   ├────────────────────────────────────────────────────────────┤
 *   │                                                             │
 *   │             ACTIVE IMAGE (full-bleed, zoomable)             │
 *   │                                                             │
 *   ├────────────────────────────────────────────────────────────┤
 *   │  Thumbnails of every other capture from this day            │
 *   └────────────────────────────────────────────────────────────┘
 *
 * Tools on the active image:
 *   - mouse-wheel zoom (1× → 8×) with pan when zoomed
 *   - keyboard: ←/→ between days · ↑/↓ between sources within day
 *   - "Open full" download
 *   - Side-by-side compare (split view of two sources)
 *   - Reset
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ZoomIn, ZoomOut, Maximize, Download, RotateCcw, SplitSquareVertical, ChevronLeft, ChevronRight, Eye, ExternalLink } from "lucide-react";
import type { IncidentAoi, IncidentDayBundle, IncidentCapture } from "@/lib/satellite";

interface Props { aoi: IncidentAoi; days: IncidentDayBundle[] }

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

// Pick best capture: Sentinel-2 → VIIRS-NOAA20 → MODIS-Terra → first
function pickBest(captures: IncidentCapture[]): IncidentCapture {
  return (
    captures.find((c) => c.source.startsWith("Sentinel-2")) ??
    captures.find((c) => c.source.includes("VIIRS NOAA-20 True")) ??
    captures.find((c) => c.source.includes("MODIS Terra True")) ??
    captures.find((c) => c.source.includes("VIIRS")) ??
    captures[0]
  );
}

export default function IncidentScrubber({ aoi, days }: Props) {
  const [dayIdx, setDayIdx] = useState(0);
  const [captureIdx, setCaptureIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [compareMode, setCompareMode] = useState(false);
  const [compareIdx, setCompareIdx] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const day = days[dayIdx];
  // Initialise captureIdx to "best" when day changes
  useEffect(() => {
    if (!day) return;
    const best = pickBest(day.captures);
    setCaptureIdx(day.captures.indexOf(best));
    setZoom(1); setPan({ x: 0, y: 0 });
  }, [dayIdx, day]);

  const capture = day?.captures[captureIdx];
  const compareCapture = compareIdx != null ? day?.captures[compareIdx] : null;

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); setDayIdx((i) => Math.min(days.length - 1, i + 1)); break;
        case "ArrowRight": e.preventDefault(); setDayIdx((i) => Math.max(0, i - 1)); break;
        case "ArrowUp": e.preventDefault(); setCaptureIdx((i) => Math.max(0, i - 1)); break;
        case "ArrowDown": e.preventDefault(); setCaptureIdx((i) => Math.min((day?.captures.length ?? 1) - 1, i + 1)); break;
        case "=": case "+": setZoom((z) => Math.min(8, z * 1.5)); break;
        case "-": case "_": setZoom((z) => Math.max(1, z / 1.5)); break;
        case "0": setZoom(1); setPan({ x: 0, y: 0 }); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [day, days.length]);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom((z) => Math.min(8, Math.max(1, z * delta)));
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    const startX = e.clientX - pan.x;
    const startY = e.clientY - pan.y;
    const onMove = (ev: MouseEvent) => setPan({ x: ev.clientX - startX, y: ev.clientY - startY });
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pan.x, pan.y, zoom]);

  if (!day || !capture) return null;

  return (
    <div className="space-y-3">
      {/* Day scrubber */}
      <div className="card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-widest text-[var(--accent)]">Day timeline · newest → oldest</div>
          <div className="text-xs text-[var(--muted)]">
            <kbd className="font-mono text-[var(--accent-glow)] mr-1">← →</kbd> step days ·
            <kbd className="font-mono text-[var(--accent-glow)] ml-2 mr-1">↑ ↓</kbd> step sources
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDayIdx((i) => Math.min(days.length - 1, i + 1))} disabled={dayIdx >= days.length - 1} className="btn disabled:opacity-30" title="Older">
            <ChevronLeft size={14}/>
          </button>
          <input
            type="range"
            min={0}
            max={days.length - 1}
            value={days.length - 1 - dayIdx}
            onChange={(e) => setDayIdx(days.length - 1 - parseInt(e.target.value))}
            className="flex-1 accent-[var(--accent-glow)]"
          />
          <button onClick={() => setDayIdx((i) => Math.max(0, i - 1))} disabled={dayIdx === 0} className="btn disabled:opacity-30" title="Newer">
            <ChevronRight size={14}/>
          </button>
          <div className="text-sm font-mono text-[var(--text)] tabular-nums min-w-[120px] text-right">{day.date}</div>
        </div>
      </div>

      {/* Source tabs */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <div className="text-[10px] uppercase tracking-widest text-[var(--accent)] mr-1">Sources today:</div>
          {day.captures.map((c, i) => (
            <button
              key={c.file}
              onClick={() => { setCaptureIdx(i); if (compareIdx === i) setCompareIdx(null); }}
              className={`btn text-[10px] ${i === captureIdx ? "btn-primary" : ""}`}
              title={`${c.source} · ${c.resolution_m ?? "?"}m · ${fmtBytes(c.size_bytes)}`}
            >
              {c.source.replace(" True Color", "").replace("Sentinel-2 (S2A)", "S2A").replace("Sentinel-2 (S2B)", "S2B").replace("Sentinel-2 (S2C)", "S2C")}
              {c.cloud_cover_percent != null && <span className="text-[var(--muted)] ml-1">· {c.cloud_cover_percent.toFixed(0)}% ☁</span>}
            </button>
          ))}
          <div className="flex-1"/>
          <button onClick={() => { setCompareMode((m) => { const next = !m; if (!next) setCompareIdx(null); else setCompareIdx(day.captures.findIndex((_, i) => i !== captureIdx)); return next; }); }} className={`btn text-xs ${compareMode ? "btn-primary" : ""}`} title="Split-view compare">
            <SplitSquareVertical size={12}/> Compare
          </button>
          <button onClick={() => { setZoom((z) => Math.max(1, z / 1.5)); }} className="btn" title="Zoom out (-)"><ZoomOut size={14}/></button>
          <span className="text-[11px] font-mono text-[var(--muted)] tabular-nums w-10 text-center">{zoom.toFixed(1)}×</span>
          <button onClick={() => { setZoom((z) => Math.min(8, z * 1.5)); }} className="btn" title="Zoom in (=)"><ZoomIn size={14}/></button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="btn" title="Reset (0)"><RotateCcw size={14}/></button>
          <a href={capture.url} download className="btn text-xs" title="Download original">
            <Download size={12}/>
          </a>
          <a href={capture.url} target="_blank" rel="noreferrer" className="btn text-xs" title="Open full size in new tab">
            <Maximize size={12}/>
          </a>
        </div>

        {/* Active stage */}
        <div
          ref={stageRef}
          className="relative bg-black rounded overflow-hidden border border-[var(--border)] cursor-grab active:cursor-grabbing"
          style={{ aspectRatio: "16 / 9", maxHeight: "calc(100dvh - 380px)" }}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
        >
          {compareMode && compareCapture ? (
            <>
              <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden border-r border-[var(--accent)]">
                <img src={capture.url} alt={capture.source} className="w-[200%] h-full object-cover" style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: "left center", imageRendering: zoom >= 3 ? "pixelated" : "auto" }} loading="lazy"/>
                <div className="absolute top-2 left-2 bg-[var(--bg-0)]/85 backdrop-blur px-2 py-1 rounded text-[10px] text-[var(--accent)]">{capture.source}</div>
              </div>
              <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
                <img src={compareCapture.url} alt={compareCapture.source} className="w-[200%] h-full object-cover" style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px) translateX(-50%)`, transformOrigin: "left center", imageRendering: zoom >= 3 ? "pixelated" : "auto" }} loading="lazy"/>
                <div className="absolute top-2 right-2 bg-[var(--bg-0)]/85 backdrop-blur px-2 py-1 rounded text-[10px] text-[var(--gold)]">{compareCapture.source}</div>
              </div>
            </>
          ) : (
            <img
              key={capture.url}
              src={capture.url}
              alt={`${aoi.name} · ${capture.source} · ${day.date}`}
              className="w-full h-full object-cover select-none"
              style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: "center center", imageRendering: zoom >= 3 ? "pixelated" : "auto" }}
              loading="lazy"
              draggable={false}
            />
          )}

          {/* Info overlay */}
          <div className="absolute top-2 left-2 bg-[var(--bg-0)]/85 backdrop-blur px-3 py-1.5 rounded text-[11px] font-mono pointer-events-none">
            <div className="text-[var(--accent-glow)]">{capture.source}</div>
            <div className="text-[var(--muted)]">{capture.resolution_m ?? "?"}m · {fmtBytes(capture.size_bytes)}{capture.datetime_utc ? ` · ${capture.datetime_utc.slice(11, 16)} UTC` : ""}</div>
          </div>

          {/* Compare picker (when in compare mode) */}
          {compareMode && (
            <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 justify-center pointer-events-none">
              <div className="bg-[var(--bg-0)]/85 backdrop-blur px-2 py-1 rounded text-[10px] text-[var(--muted)] pointer-events-auto flex items-center gap-1">
                Right side:
                <select value={compareIdx ?? 0} onChange={(e) => setCompareIdx(parseInt(e.target.value))} className="select bg-transparent text-[var(--text)] text-[10px] py-0">
                  {day.captures.map((c, i) => i === captureIdx ? null : <option key={c.file} value={i}>{c.source}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filmstrip — all captures from this day as thumbnails */}
      <div className="card p-3">
        <div className="text-[10px] uppercase tracking-widest text-[var(--accent)] mb-2">All {day.captures.length} captures · {day.date}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {day.captures.map((c, i) => (
            <button
              key={c.file}
              onClick={() => setCaptureIdx(i)}
              className={`relative aspect-video rounded overflow-hidden border ${i === captureIdx ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--muted)]"}`}
            >
              <img src={c.url} alt={c.source} className="w-full h-full object-cover" loading="lazy"/>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 py-1 text-[9px] text-[var(--text)] font-mono text-left">
                {c.source.replace(" True Color", "")}
                <div className="text-[var(--muted)]">{c.resolution_m ?? "?"}m{c.cloud_cover_percent != null ? ` · ${c.cloud_cover_percent.toFixed(0)}%☁` : ""}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Day list (mini index) */}
      {days.length > 1 && (
        <div className="card p-3">
          <div className="text-[10px] uppercase tracking-widest text-[var(--accent)] mb-2">All archived days for this location</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
            {days.map((d, i) => (
              <button
                key={d.date}
                onClick={() => setDayIdx(i)}
                className={`text-xs font-mono px-2 py-1.5 rounded border ${i === dayIdx ? "border-[var(--accent)] bg-[var(--bg-1)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)] hover:text-[var(--text)]"}`}
              >
                {d.date}
                <div className="text-[9px] opacity-60">{d.captures.length} src</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
