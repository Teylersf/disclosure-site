"use client";

/**
 * Video analyzer — frame-perfect controls + canvas-pipeline effects.
 *
 * Pipeline:
 *   <video crossorigin> hidden in DOM
 *     │
 *     ▼  drawImage every animation frame (when playing) or on demand (when paused)
 *   <canvas data-layer="frame">     ← raw frame, never altered
 *     │
 *     ▼  optional filters chain (CSS filter or per-pixel)
 *   <canvas data-layer="display">   ← user-visible, accepts brightness/contrast/edge etc
 *     +
 *   <canvas data-layer="overlay">   ← rulers, grid, annotations
 *
 * Effects implemented:
 *   - CSS-filter-cheap: brightness, contrast, saturate, hue, blur, grayscale, invert, sepia
 *   - Pixel-level: edge detection (Sobel), frame difference (subtract from anchor frame),
 *                  channel isolation (R / G / B / luma)
 *
 * Interaction:
 *   - Hover anywhere on the video: pixel inspector shows (x, y) and color
 *   - Click to drop annotation pins
 *   - Drag to pan when zoomed > 1×
 *   - Mouse wheel to zoom around cursor
 *
 * Keyboard:
 *   space / k     play-pause
 *   , .           frame back / forward
 *   shift ←/→     ±5 s         shift L     +10 s          j   −10 s
 *   - / =         speed down/up                            0   reset speed
 *   b / n         set A / B loop bounds                    l   toggle A-B loop
 *   1-5           preset zoom levels (1×, 2×, 4×, 8×, 16×)
 *   e d g h c i   toggle edge / diff / grid / histogram / color picker / info panel
 *   r             reset all effects
 *   f             fullscreen
 *   s             screenshot (annotations baked in)
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Play, Pause, SkipBack, SkipForward, ChevronsLeft, ChevronsRight,
  Maximize, Camera, Crosshair, Grid3x3, BarChart3, Eye, EyeOff,
  RotateCcw, ZoomIn, ZoomOut, Repeat, Gauge, Settings, Layers, FileText, Sliders,
} from "lucide-react";
import type { UapRecord } from "@/lib/types";
import { assetUrl } from "@/lib/asset-url";
import Histogram from "./analyzer/Histogram";

type Props = {
  records: UapRecord[];
  initialId?: string;
};

const SPEEDS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];
const ZOOM_PRESETS = [1, 2, 4, 8, 16];
const ASSUMED_FPS = 30;

function fmtTime(s: number): string {
  if (!isFinite(s)) return "0:00.000";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  return `${m}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

interface FilterState {
  brightness: number;   // 0 - 200
  contrast: number;     // 0 - 200
  saturate: number;     // 0 - 200
  hue: number;          // -180 - 180 deg
  blur: number;         // 0 - 10 px
  grayscale: boolean;
  invert: boolean;
  channel: "rgb" | "r" | "g" | "b" | "luma";
  edge: number;         // 0 - 100 (intensity)
  frameDiff: boolean;   // toggle frame-diff mode
}

const DEFAULT_FILTERS: FilterState = {
  brightness: 100, contrast: 100, saturate: 100, hue: 0, blur: 0,
  grayscale: false, invert: false, channel: "rgb", edge: 0, frameDiff: false,
};

interface Annotation { id: string; x: number; y: number; t: number; label?: string }
interface LoopRange { a: number | null; b: number | null; on: boolean }

export default function VideoAnalyzer({ records, initialId }: Props) {
  const videoRecords = useMemo(() => records.filter((r) => r.type === "VID" || r.type === "AUD"), [records]);
  const [selectedId, setSelectedId] = useState(initialId ?? videoRecords[0]?.id);
  const record = videoRecords.find((r) => r.id === selectedId);

  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement>(null);   // raw frame
  const displayCanvasRef = useRef<HTMLCanvasElement>(null); // user-visible (filtered)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // rulers/annotations
  const anchorFrameRef = useRef<ImageData | null>(null);
  const rafRef = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoSize, setVideoSize] = useState({ w: 1920, h: 1080 });
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [loop, setLoop] = useState<LoopRange>({ a: null, b: null, on: false });
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pickedPixel, setPickedPixel] = useState<null | { x: number; y: number; r: number; g: number; b: number }>(null);
  const [histogramFrame, setHistogramFrame] = useState<ImageData | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showHistogram, setShowHistogram] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tool, setTool] = useState<"pan" | "pick" | "annotate">("pan");

  const src = record
    ? record.dvids?.files?.[0]?.src
      ? assetUrl(record.dvids.files[0].src)
      : assetUrl(record.asset?.url)
    : "";

  // CSS filter string for the cheap effects
  const cssFilter = useMemo(() => {
    const f = filters;
    const parts: string[] = [];
    if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
    if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
    if (f.saturate !== 100) parts.push(`saturate(${f.saturate}%)`);
    if (f.hue !== 0) parts.push(`hue-rotate(${f.hue}deg)`);
    if (f.blur > 0) parts.push(`blur(${f.blur}px)`);
    if (f.grayscale) parts.push("grayscale(1)");
    if (f.invert) parts.push("invert(1)");
    return parts.join(" ") || "none";
  }, [filters]);

  // Reset on record change
  useEffect(() => {
    setCurrentTime(0); setDuration(0); setPlaying(false); setError(null);
    setLoop({ a: null, b: null, on: false }); setAnnotations([]); setPickedPixel(null);
    anchorFrameRef.current = null;
    setFilters(DEFAULT_FILTERS); setZoom(1); setPan({ x: 0, y: 0 });
  }, [selectedId]);

  // Sync video element with state
  useEffect(() => { if (videoRef.current) videoRef.current.muted = muted; }, [muted]);
  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = speed; }, [speed]);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing && v.readyState >= 3) v.play().catch(() => setPlaying(false));
    else if (!playing) v.pause();
  }, [playing]);

  // Video event wiring
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      setDuration(v.duration || 0);
      setVideoSize({ w: v.videoWidth, h: v.videoHeight });
    };
    const onTime = () => {
      setCurrentTime(v.currentTime);
      if (loop.on && loop.a != null && loop.b != null && v.currentTime >= loop.b) {
        v.currentTime = loop.a;
      }
    };
    const onCanPlay = () => { setError(null); if (playing) v.play().catch(() => setPlaying(false)); };
    const onErr = () => setError("Video couldn't load. The bucket may not have CORS allowed for analysis.");
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("error", onErr);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("error", onErr);
    };
  }, [loop, playing]);

  // Frame rendering loop — drives both the visible canvas and pixel-level effects.
  useEffect(() => {
    const v = videoRef.current;
    const frame = frameCanvasRef.current;
    const display = displayCanvasRef.current;
    if (!v || !frame || !display) return;

    const fctx = frame.getContext("2d", { willReadFrequently: true });
    const dctx = display.getContext("2d", { willReadFrequently: true });
    if (!fctx || !dctx) return;

    const tick = () => {
      if (v.videoWidth && v.videoHeight) {
        if (frame.width !== v.videoWidth) frame.width = display.width = v.videoWidth;
        if (frame.height !== v.videoHeight) frame.height = display.height = v.videoHeight;

        try {
          fctx.drawImage(v, 0, 0, frame.width, frame.height);
        } catch {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        // Get pixels and apply per-pixel transforms
        if (filters.edge > 0 || filters.frameDiff || filters.channel !== "rgb") {
          try {
            const imgData = fctx.getImageData(0, 0, frame.width, frame.height);
            let out = imgData;

            if (filters.channel !== "rgb") {
              out = isolateChannel(out, filters.channel);
            }
            if (filters.frameDiff && anchorFrameRef.current) {
              out = frameDifference(out, anchorFrameRef.current);
            }
            if (filters.edge > 0) {
              out = sobel(out, filters.edge / 100);
            }

            dctx.putImageData(out, 0, 0);
            // Save current frame for histogram every N frames (sample)
            if (showHistogram) setHistogramFrame(imgData);
          } catch (e) {
            // CORS-tainted canvas — fall back to no pixel processing
            dctx.drawImage(frame, 0, 0);
          }
        } else {
          dctx.drawImage(frame, 0, 0);
          if (showHistogram) {
            try {
              setHistogramFrame(fctx.getImageData(0, 0, frame.width, frame.height));
            } catch {}
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [filters, showHistogram, selectedId]);

  // Overlay (grid + annotations) — re-render on dependent changes
  useEffect(() => {
    const c = overlayCanvasRef.current;
    if (!c) return;
    c.width = videoSize.w; c.height = videoSize.h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);

    if (showGrid) {
      ctx.strokeStyle = "rgba(94,234,212,0.45)";
      ctx.lineWidth = 1;
      // Rule of thirds
      for (let i = 1; i < 3; i++) {
        const x = (c.width * i) / 3;
        const y = (c.height * i) / 3;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke();
      }
      // Center crosshair
      ctx.strokeStyle = "rgba(255,209,102,0.75)";
      ctx.lineWidth = 1.5;
      const cx = c.width / 2, cy = c.height / 2, sz = 30;
      ctx.beginPath(); ctx.moveTo(cx - sz, cy); ctx.lineTo(cx + sz, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - sz); ctx.lineTo(cx, cy + sz); ctx.stroke();
    }

    for (const a of annotations) {
      ctx.fillStyle = "rgba(255,209,102,0.9)";
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(a.x, a.y, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#000";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(annotations.indexOf(a) + 1 + "", a.x, a.y);
    }
  }, [showGrid, annotations, videoSize]);

  // Helpers
  const frameStep = useCallback((dir: 1 | -1) => {
    const v = videoRef.current; if (!v) return;
    v.pause(); setPlaying(false);
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + dir / ASSUMED_FPS));
  }, []);
  const seek = useCallback((sec: number) => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || sec, sec));
  }, []);
  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current; if (!v) return;
    seek(v.currentTime + delta);
  }, [seek]);

  // Mouse → video coordinate conversion
  const eventToVideoCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = overlayCanvasRef.current;
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * c.width;
    const y = ((e.clientY - rect.top) / rect.height) * c.height;
    return { x: Math.floor(x), y: Math.floor(y) };
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const p = eventToVideoCoords(e); if (!p) return;
    if (tool === "annotate") {
      setAnnotations((arr) => [...arr, { id: String(Date.now()), x: p.x, y: p.y, t: currentTime }]);
    } else if (tool === "pick") {
      sampleColor(p.x, p.y);
    }
  };

  const onCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== "pick") return;
    const p = eventToVideoCoords(e); if (!p) return;
    sampleColor(p.x, p.y);
  };

  const sampleColor = (x: number, y: number) => {
    const c = frameCanvasRef.current; if (!c) return;
    try {
      const d = c.getContext("2d")!.getImageData(x, y, 1, 1).data;
      setPickedPixel({ x, y, r: d[0], g: d[1], b: d[2] });
    } catch {}
  };

  const captureAnchor = () => {
    const c = frameCanvasRef.current; if (!c) return;
    try {
      anchorFrameRef.current = c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
      setFilters((f) => ({ ...f, frameDiff: true }));
    } catch {}
  };

  const takeScreenshot = () => {
    const d = displayCanvasRef.current, o = overlayCanvasRef.current;
    if (!d || !o) return;
    const out = document.createElement("canvas");
    out.width = d.width; out.height = d.height;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(d, 0, 0);
    ctx.drawImage(o, 0, 0);
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${record?.id ?? "frame"}-t${currentTime.toFixed(2)}s.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.code) {
        case "Space": case "KeyK": e.preventDefault(); setPlaying((p) => !p); break;
        case "Comma": e.preventDefault(); frameStep(-1); break;
        case "Period": e.preventDefault(); frameStep(1); break;
        case "ArrowLeft": e.shiftKey ? seekBy(-5) : seekBy(-1); break;
        case "ArrowRight": e.shiftKey ? seekBy(5) : seekBy(1); break;
        case "KeyJ": seekBy(-10); break;
        case "KeyL":
          if (e.shiftKey) seekBy(10);
          else setLoop((lp) => ({ ...lp, on: !lp.on }));
          break;
        case "Minus": setSpeed((s) => SPEEDS[Math.max(0, SPEEDS.indexOf(s) - 1)] ?? s); break;
        case "Equal": setSpeed((s) => SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(s) + 1)] ?? s); break;
        case "Digit0": setSpeed(1); break;
        case "KeyB": setLoop((lp) => ({ ...lp, a: v.currentTime })); break;
        case "KeyN": setLoop((lp) => ({ ...lp, b: v.currentTime })); break;
        case "Digit1": setZoom(1); setPan({ x: 0, y: 0 }); break;
        case "Digit2": setZoom(2); break;
        case "Digit3": setZoom(4); break;
        case "Digit4": setZoom(8); break;
        case "Digit5": setZoom(16); break;
        case "KeyE": setFilters((f) => ({ ...f, edge: f.edge > 0 ? 0 : 60 })); break;
        case "KeyD": filters.frameDiff ? setFilters((f) => ({ ...f, frameDiff: false })) : captureAnchor(); break;
        case "KeyG": setShowGrid((g) => !g); break;
        case "KeyH": setShowHistogram((g) => !g); break;
        case "KeyC": setTool((t) => t === "pick" ? "pan" : "pick"); break;
        case "KeyI": setShowInfo((g) => !g); break;
        case "KeyR": setFilters(DEFAULT_FILTERS); setZoom(1); setPan({ x: 0, y: 0 }); break;
        case "KeyF": if (playerRef.current) { document.fullscreenElement ? document.exitFullscreen() : playerRef.current.requestFullscreen(); } break;
        case "KeyS": e.preventDefault(); takeScreenshot(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filters.frameDiff, frameStep, seekBy]);

  if (!record) return <div className="p-10 text-center text-[var(--muted)]">No video records available.</div>;

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4 h-full">
      <div ref={playerRef} className="flex flex-col gap-3 min-w-0">
        {/* Video stage */}
        <div className="card bg-black overflow-hidden relative">
          <div className="relative" style={{ aspectRatio: `${videoSize.w} / ${videoSize.h}` }}>
            {/* Hidden video — actual media source */}
            <video
              key={`${selectedId}`}
              ref={videoRef}
              src={src}
              crossOrigin="anonymous"
              preload="auto"
              muted={muted}
              playsInline
              className="absolute inset-0 w-px h-px opacity-0 pointer-events-none"
            />
            {/* Frame canvas — hidden, source of truth for raw pixels */}
            <canvas ref={frameCanvasRef} className="hidden" />
            {/* Display canvas — visible, filtered output */}
            <canvas
              ref={displayCanvasRef}
              className="absolute inset-0 w-full h-full"
              style={{
                filter: cssFilter,
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transformOrigin: "center center",
                imageRendering: zoom >= 4 ? "pixelated" : "auto",
              }}
            />
            {/* Overlay canvas — grid, annotations, picker */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair"
              style={{
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transformOrigin: "center center",
              }}
              onClick={onCanvasClick}
              onMouseMove={onCanvasMouseMove}
            />

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/85">
                <div className="bg-[var(--bg-1)] border border-[var(--pdf)] rounded p-6 max-w-md text-center">
                  <div className="text-[var(--pdf)] font-bold mb-2">Couldn&apos;t load video</div>
                  <div className="text-[var(--muted)] text-sm">{error}</div>
                </div>
              </div>
            )}

            {/* Time / info overlay */}
            {showInfo && (
              <div className="absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none gap-2">
                <div className="bg-black/75 backdrop-blur-sm px-3 py-2 rounded text-[11px] font-mono leading-tight pointer-events-auto">
                  <div className="text-[var(--accent-glow)]">{fmtTime(currentTime)} / {fmtTime(duration)}</div>
                  <div className="text-[var(--muted)]">frame ≈ {Math.floor(currentTime * ASSUMED_FPS)}  ·  {speed}× speed</div>
                  <div className="text-[var(--muted)]">{videoSize.w}×{videoSize.h}  ·  zoom {zoom}×</div>
                </div>
                <div className="bg-black/75 backdrop-blur-sm px-3 py-2 rounded text-[11px] pointer-events-auto max-w-[60%]">
                  <div className="text-[var(--gold)] uppercase tracking-widest text-[9px]">{record.type} · {record.agency}</div>
                  <div className="text-white font-semibold line-clamp-2">{record.title}</div>
                </div>
              </div>
            )}

            {/* Loop bounds visual */}
            {loop.a != null && loop.b != null && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--gold)]/30">
                <div
                  className="absolute h-full bg-[var(--gold)]/60"
                  style={{
                    left: `${(loop.a / Math.max(1, duration)) * 100}%`,
                    width: `${Math.max(0, (loop.b - loop.a) / Math.max(1, duration)) * 100}%`,
                  }}
                />
              </div>
            )}

            {pickedPixel && tool === "pick" && (
              <div className="absolute bottom-3 left-3 bg-black/85 backdrop-blur-sm rounded px-3 py-2 text-[11px] font-mono flex items-center gap-3 pointer-events-none">
                <div className="w-6 h-6 rounded border border-white/40" style={{ background: `rgb(${pickedPixel.r}, ${pickedPixel.g}, ${pickedPixel.b})` }} />
                <div className="text-[var(--text)]">
                  ({pickedPixel.x}, {pickedPixel.y})
                  <br />
                  RGB {pickedPixel.r}, {pickedPixel.g}, {pickedPixel.b}
                </div>
                <div className="text-[var(--muted)]">
                  HEX #{((1 << 24) + (pickedPixel.r << 16) + (pickedPixel.g << 8) + pickedPixel.b).toString(16).slice(1).toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls bar */}
        <div className="card flex flex-col">
          {/* Scrubber */}
          <div className="px-3 md:px-5 pt-3 flex items-center gap-2">
            <span className="text-[10px] md:text-xs font-mono text-[var(--muted)] tabular-nums w-20 text-right">{fmtTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.001}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="flex-1 accent-[var(--accent-glow)]"
            />
            <span className="text-[10px] md:text-xs font-mono text-[var(--muted)] tabular-nums w-20">{fmtTime(duration)}</span>
          </div>
          {/* Button row */}
          <div className="px-3 md:px-5 py-2.5 flex items-center gap-1.5 flex-wrap">
            <button type="button" onClick={() => seek(0)} className="btn" title="Restart"><SkipBack size={14}/></button>
            <button type="button" onClick={() => frameStep(-1)} className="btn" title="Frame back (,)"><ChevronsLeft size={14}/></button>
            <button type="button" onClick={() => setPlaying((p) => !p)} className="btn btn-primary" title="Play/pause (Space)">{playing ? <Pause size={14}/> : <Play size={14}/>}</button>
            <button type="button" onClick={() => frameStep(1)} className="btn" title="Frame forward (.)"><ChevronsRight size={14}/></button>
            <button type="button" onClick={() => seek(duration)} className="btn" title="Jump to end"><SkipForward size={14}/></button>

            <div className="w-px h-6 bg-[var(--border)] mx-1"/>

            <div className="flex items-center gap-1.5">
              <Gauge size={14} className={speed === 1 ? "text-[var(--muted)]" : "text-[var(--gold)]"}/>
              <select value={String(speed)} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="select text-xs">
                {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
              </select>
            </div>

            <div className="w-px h-6 bg-[var(--border)] mx-1"/>

            <button type="button" onClick={() => setLoop((lp) => ({ ...lp, a: currentTime }))} className="btn text-[10px] font-mono" title="Set loop A (B)">A {loop.a != null && `· ${loop.a.toFixed(2)}s`}</button>
            <button type="button" onClick={() => setLoop((lp) => ({ ...lp, b: currentTime }))} className="btn text-[10px] font-mono" title="Set loop B (N)">B {loop.b != null && `· ${loop.b.toFixed(2)}s`}</button>
            <button type="button" onClick={() => setLoop((lp) => ({ ...lp, on: !lp.on }))} className={`btn ${loop.on ? "btn-primary" : ""}`} title="Toggle loop (L)"><Repeat size={14}/></button>

            <div className="w-px h-6 bg-[var(--border)] mx-1"/>

            <button type="button" onClick={() => setZoom((z) => Math.max(1, z / 2))} className="btn" title="Zoom out"><ZoomOut size={14}/></button>
            <span className="text-[10px] font-mono text-[var(--muted)] tabular-nums w-6 text-center">{zoom}×</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(16, z * 2))} className="btn" title="Zoom in"><ZoomIn size={14}/></button>

            <div className="ml-auto flex items-center gap-1.5">
              <button type="button" onClick={takeScreenshot} className="btn" title="Screenshot (S)"><Camera size={14}/></button>
              <button type="button" onClick={() => { if (playerRef.current) { document.fullscreenElement ? document.exitFullscreen() : playerRef.current.requestFullscreen(); } }} className="btn" title="Fullscreen (F)"><Maximize size={14}/></button>
            </div>
          </div>

          {/* Tool row */}
          <div className="px-3 md:px-5 pb-3 flex items-center gap-1.5 flex-wrap border-t border-[var(--border)] pt-2">
            <span className="text-[10px] uppercase tracking-widest text-[var(--muted)]">Tool:</span>
            <button type="button" onClick={() => setTool("pan")} className={`btn ${tool === "pan" ? "btn-primary" : ""}`} title="Pan/zoom mode"><Crosshair size={12}/> pan</button>
            <button type="button" onClick={() => setTool("pick")} className={`btn ${tool === "pick" ? "btn-primary" : ""}`} title="Color picker (C)"><Eye size={12}/> pick</button>
            <button type="button" onClick={() => setTool("annotate")} className={`btn ${tool === "annotate" ? "btn-primary" : ""}`} title="Drop annotation pin">📌 pin</button>

            <div className="w-px h-5 bg-[var(--border)] mx-1"/>

            <button type="button" onClick={() => setShowGrid((v) => !v)} className={`btn ${showGrid ? "btn-primary" : ""}`} title="Grid (G)"><Grid3x3 size={12}/></button>
            <button type="button" onClick={() => setShowHistogram((v) => !v)} className={`btn ${showHistogram ? "btn-primary" : ""}`} title="Histogram (H)"><BarChart3 size={12}/></button>
            <button type="button" onClick={() => setShowInfo((v) => !v)} className={`btn ${showInfo ? "btn-primary" : ""}`} title="Info overlay (I)">{showInfo ? <Eye size={12}/> : <EyeOff size={12}/>}</button>
            <button type="button" onClick={() => setShowFilters((v) => !v)} className={`btn ${showFilters ? "btn-primary" : ""}`} title="Filter panel"><Sliders size={12}/></button>

            <button type="button" onClick={() => { setFilters(DEFAULT_FILTERS); setZoom(1); setPan({ x: 0, y: 0 }); setAnnotations([]); }} className="btn ml-auto" title="Reset everything (R)"><RotateCcw size={12}/> reset</button>
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="text-[10px] text-[var(--muted)] tracking-wider flex flex-wrap gap-x-4 gap-y-1 px-1">
          <span><kbd className="font-mono text-[var(--accent-glow)]">space</kbd> play/pause</span>
          <span><kbd className="font-mono text-[var(--accent-glow)]">, .</kbd> frame</span>
          <span><kbd className="font-mono text-[var(--accent-glow)]">← →</kbd> ±1s</span>
          <span><kbd className="font-mono text-[var(--accent-glow)]">⇧ ← →</kbd> ±5s</span>
          <span><kbd className="font-mono text-[var(--accent-glow)]">b/n</kbd> loop A/B</span>
          <span><kbd className="font-mono text-[var(--accent-glow)]">−/=</kbd> speed</span>
          <span><kbd className="font-mono text-[var(--accent-glow)]">1-5</kbd> zoom 1× — 16×</span>
          <span><kbd className="font-mono text-[var(--accent-glow)]">e</kbd> edges</span>
          <span><kbd className="font-mono text-[var(--accent-glow)]">d</kbd> frame-diff</span>
          <span><kbd className="font-mono text-[var(--accent-glow)]">g</kbd> grid</span>
          <span><kbd className="font-mono text-[var(--accent-glow)]">h</kbd> histogram</span>
          <span><kbd className="font-mono text-[var(--accent-glow)]">c</kbd> picker</span>
          <span><kbd className="font-mono text-[var(--accent-glow)]">s</kbd> screenshot</span>
          <span><kbd className="font-mono text-[var(--accent-glow)]">r</kbd> reset</span>
          <span><kbd className="font-mono text-[var(--accent-glow)]">f</kbd> fullscreen</span>
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="space-y-3 overflow-y-auto max-h-[calc(100dvh-180px)]">
        {/* Video picker */}
        <div className="card p-3">
          <label className="text-[10px] uppercase tracking-widest text-[var(--accent)] mb-2 block">Video</label>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="select w-full text-sm">
            {videoRecords.map((r) => (
              <option key={r.id} value={r.id}>{r.title.slice(0, 60)}{r.title.length > 60 ? "…" : ""}</option>
            ))}
          </select>
          <Link href={`/records/${record.id}`} className="text-[11px] text-[var(--accent-glow)] mt-2 inline-block">
            <FileText size={11} className="inline mr-1"/> Open full record →
          </Link>
        </div>

        {/* Histogram */}
        {showHistogram && (
          <div className="card p-3">
            <label className="text-[10px] uppercase tracking-widest text-[var(--accent)] mb-2 block">Histogram (R · G · B)</label>
            <Histogram frame={histogramFrame} />
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="card p-3 space-y-3">
            <label className="text-[10px] uppercase tracking-widest text-[var(--accent)] block">Filters</label>

            <Slider label="Brightness" value={filters.brightness} min={0} max={300} unit="%" onChange={(v) => setFilters((f) => ({ ...f, brightness: v }))} />
            <Slider label="Contrast" value={filters.contrast} min={0} max={300} unit="%" onChange={(v) => setFilters((f) => ({ ...f, contrast: v }))} />
            <Slider label="Saturation" value={filters.saturate} min={0} max={300} unit="%" onChange={(v) => setFilters((f) => ({ ...f, saturate: v }))} />
            <Slider label="Hue rotate" value={filters.hue} min={-180} max={180} unit="°" onChange={(v) => setFilters((f) => ({ ...f, hue: v }))} />
            <Slider label="Blur" value={filters.blur} min={0} max={10} step={0.5} unit="px" onChange={(v) => setFilters((f) => ({ ...f, blur: v }))} />
            <Slider label="Edge detect" value={filters.edge} min={0} max={100} unit="%" onChange={(v) => setFilters((f) => ({ ...f, edge: v }))} />

            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setFilters((f) => ({ ...f, grayscale: !f.grayscale }))} className={`btn text-xs ${filters.grayscale ? "btn-primary" : ""}`}>Grayscale</button>
              <button type="button" onClick={() => setFilters((f) => ({ ...f, invert: !f.invert }))} className={`btn text-xs ${filters.invert ? "btn-primary" : ""}`}>Invert</button>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Channel</label>
              <div className="grid grid-cols-5 gap-1 mt-1">
                {(["rgb", "r", "g", "b", "luma"] as const).map((ch) => (
                  <button key={ch} type="button" onClick={() => setFilters((f) => ({ ...f, channel: ch }))}
                    className={`btn text-[10px] uppercase ${filters.channel === ch ? "btn-primary" : ""}`}>
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={captureAnchor} className={`btn text-xs ${filters.frameDiff ? "btn-primary" : ""}`} title="Capture this frame, then show diff against future frames (D)">Capture anchor</button>
              <button type="button" onClick={() => setFilters((f) => ({ ...f, frameDiff: false }))} className="btn text-xs" disabled={!filters.frameDiff}>Clear diff</button>
            </div>

            <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="btn text-xs w-full">
              <RotateCcw size={12}/> Reset filters
            </button>
          </div>
        )}

        {/* Annotations */}
        {annotations.length > 0 && (
          <div className="card p-3">
            <label className="text-[10px] uppercase tracking-widest text-[var(--accent)] mb-2 block">Pins ({annotations.length})</label>
            <div className="space-y-1.5 text-xs">
              {annotations.map((a, i) => (
                <div key={a.id} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[var(--gold)] text-[var(--bg-0)] text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  <button type="button" onClick={() => seek(a.t)} className="text-[var(--accent-glow)] font-mono">{fmtTime(a.t)}</button>
                  <span className="text-[var(--muted)] font-mono">({a.x}, {a.y})</span>
                  <button type="button" onClick={() => setAnnotations((arr) => arr.filter((x) => x.id !== a.id))} className="ml-auto text-[var(--pdf)]">×</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, unit, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-[var(--muted)] uppercase tracking-wider">{label}</span>
        <span className="text-[var(--text)] font-mono">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-[var(--accent-glow)]" />
    </div>
  );
}

// ---------- Pixel-level effects ----------

function sobel(img: ImageData, intensity: number): ImageData {
  const w = img.width, h = img.height;
  const src = img.data;
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < src.length; i += 4, j++) {
    gray[j] = (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114) | 0;
  }
  const out = new Uint8ClampedArray(src.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const a = gray[(y - 1) * w + (x - 1)];
      const b = gray[(y - 1) * w + x];
      const c = gray[(y - 1) * w + (x + 1)];
      const d = gray[y * w + (x - 1)];
      const f = gray[y * w + (x + 1)];
      const g = gray[(y + 1) * w + (x - 1)];
      const hh = gray[(y + 1) * w + x];
      const i2 = gray[(y + 1) * w + (x + 1)];
      const gx = -a - 2 * d - g + c + 2 * f + i2;
      const gy = -a - 2 * b - c + g + 2 * hh + i2;
      const mag = Math.min(255, Math.hypot(gx, gy) * intensity);
      const idx = (y * w + x) * 4;
      out[idx] = out[idx + 1] = out[idx + 2] = mag;
      out[idx + 3] = 255;
    }
  }
  return new ImageData(out, w, h);
}

function frameDifference(current: ImageData, anchor: ImageData): ImageData {
  const out = new Uint8ClampedArray(current.data.length);
  const a = current.data, b = anchor.data;
  if (a.length !== b.length) return current;
  for (let i = 0; i < a.length; i += 4) {
    const dr = Math.abs(a[i] - b[i]);
    const dg = Math.abs(a[i + 1] - b[i + 1]);
    const db = Math.abs(a[i + 2] - b[i + 2]);
    const m = Math.min(255, (dr + dg + db) * 2);
    out[i] = m; out[i + 1] = m; out[i + 2] = m; out[i + 3] = 255;
  }
  return new ImageData(out, current.width, current.height);
}

function isolateChannel(img: ImageData, ch: "r" | "g" | "b" | "luma"): ImageData {
  const out = new Uint8ClampedArray(img.data.length);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let v: number;
    if (ch === "r") v = d[i];
    else if (ch === "g") v = d[i + 1];
    else if (ch === "b") v = d[i + 2];
    else v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    out[i] = out[i + 1] = out[i + 2] = v;
    out[i + 3] = 255;
  }
  return new ImageData(out, img.width, img.height);
}
