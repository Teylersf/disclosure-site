"use client";

/**
 * Simple frame viewer for the geostationary captures.
 *
 *   ┌────────────────────────────────────────────────────────────┐
 *   │ [Satellite: GOES-East ▾] [📅 May 30 ◀ ▶] [▶ Play]         │
 *   ├────────────────────────────────────────────────────────────┤
 *   │                                                            │
 *   │              T H E   L A T E S T   F R A M E              │
 *   │                                                            │
 *   ├────────────────────────────────────────────────────────────┤
 *   │ 12:20 UTC · 863 KB · download                              │
 *   ├────────────────────────────────────────────────────────────┤
 *   │ ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ scrub today's frames   │
 *   └────────────────────────────────────────────────────────────┘
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Play, Pause, ChevronLeft, ChevronRight, Calendar, Satellite, Maximize } from "lucide-react";
import type { SatelliteData, GeostationarySummary, GeostationaryFrame, GeostationaryDay } from "@/lib/satellite";

const SAT_LABELS: Record<string, { label: string; region: string }> = {
  "goes-east":    { label: "GOES-East",        region: "Americas — full disc" },
  "goes-west":    { label: "GOES-West",        region: "Pacific — full disc" },
  "himawari-vis": { label: "Himawari Band 3",  region: "Asia/Pacific — visible (daytime)" },
  "himawari-ir":  { label: "Himawari Band 13", region: "Asia/Pacific — clean IR (24/7)" },
};

function fmtBytes(b: number): string {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

interface Props {
  data: SatelliteData;
}

export default function LiveFrameViewer({ data }: Props) {
  const geo = data.geostationary ?? {};
  const satIds = useMemo(() => Object.keys(geo).sort(), [geo]);
  const [satId, setSatId] = useState<string>(satIds[0] ?? "");
  const sat: GeostationarySummary | undefined = geo[satId];

  // Pick the most-recent day with data
  const days: GeostationaryDay[] = sat?.recent_days ?? [];
  const [dayIdx, setDayIdx] = useState(0);
  const day = days[dayIdx];
  const frames: GeostationaryFrame[] = day?.frames ?? [];
  const [frameIdx, setFrameIdx] = useState(frames.length - 1);
  const [playing, setPlaying] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const playTimerRef = useRef<number | null>(null);
  const framesRef = useRef(frames);
  useEffect(() => { framesRef.current = frames; }, [frames]);

  // Reset to latest frame when sat or day changes
  useEffect(() => { setFrameIdx(frames.length - 1); }, [satId, dayIdx, frames.length]);

  const frame = frames[frameIdx];

  // Preload every frame for the day as an Image() so the browser has them
  // fully decoded before the animation starts. Without this, each tick
  // triggers a fresh network fetch + JPEG decode — visible flicker.
  const preloadAll = useCallback(async (): Promise<void> => {
    const list = framesRef.current;
    if (list.length === 0) return;
    setPreloadProgress({ loaded: 0, total: list.length });
    let done = 0;
    await Promise.all(list.map((f) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        const finish = () => { done++; setPreloadProgress({ loaded: done, total: list.length }); resolve(); };
        img.onload = finish;
        img.onerror = finish;
        img.src = f.url;
      })
    ));
    setPreloadProgress(null);
  }, []);

  const togglePlay = useCallback(async () => {
    // If currently playing, just pause
    if (playing) {
      if (playTimerRef.current != null) window.clearInterval(playTimerRef.current);
      playTimerRef.current = null;
      setPlaying(false);
      return;
    }
    // Preload, then start the interval
    await preloadAll();
    setFrameIdx(0);
    setPlaying(true);
    playTimerRef.current = window.setInterval(() => {
      setFrameIdx((i) => {
        const len = framesRef.current.length;
        if (len === 0) return 0;
        return (i + 1) % len; // loop
      });
    }, 500);
  }, [playing, preloadAll]);

  // Clean up timer on unmount
  useEffect(() => () => { if (playTimerRef.current != null) window.clearInterval(playTimerRef.current); }, []);

  // Pause if user changes sat or day mid-play (otherwise we'd animate the wrong set)
  useEffect(() => {
    if (playing && playTimerRef.current != null) {
      window.clearInterval(playTimerRef.current);
      playTimerRef.current = null;
      setPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satId, dayIdx]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = (e.target as HTMLElement)?.tagName;
      if (t === "INPUT" || t === "SELECT" || t === "TEXTAREA") return;
      switch (e.key) {
        case "ArrowLeft":  e.preventDefault(); setFrameIdx((i) => Math.max(0, i - 1)); break;
        case "ArrowRight": e.preventDefault(); setFrameIdx((i) => Math.min(frames.length - 1, i + 1)); break;
        case "ArrowDown":  e.preventDefault(); setDayIdx((i) => Math.min(days.length - 1, i + 1)); break;
        case "ArrowUp":    e.preventDefault(); setDayIdx((i) => Math.max(0, i - 1)); break;
        case " ":          e.preventDefault(); togglePlay(); break;
        case "Home":       setFrameIdx(0); break;
        case "End":        setFrameIdx(frames.length - 1); break;
        case "f": case "F":
          if (document.fullscreenElement) document.exitFullscreen();
          else stageRef.current?.requestFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [frames.length, days.length, togglePlay]);

  if (satIds.length === 0) {
    return (
      <div className="card p-12 text-center text-[var(--muted)]">
        <Satellite size={32} className="inline mb-3 opacity-50"/>
        <div className="text-sm">No geostationary captures yet.</div>
        <div className="text-[11px] mt-1">The Modal pipeline runs every 30 min; first manifest rebuild fires at the next xx:15 UTC.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top control bar */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        {/* Sat picker */}
        <div className="flex items-center gap-1 bg-[var(--bg-1)] rounded px-2 py-1 border border-[var(--border)]">
          <Satellite size={14} className="text-[var(--accent)]"/>
          <select
            value={satId}
            onChange={(e) => { setSatId(e.target.value); setDayIdx(0); }}
            className="bg-transparent text-sm text-[var(--text)] outline-none pr-1"
          >
            {satIds.map((id) => (
              <option key={id} value={id}>{SAT_LABELS[id]?.label ?? id} · {SAT_LABELS[id]?.region ?? ""}</option>
            ))}
          </select>
        </div>

        {/* Day picker */}
        <div className="flex items-center gap-1 bg-[var(--bg-1)] rounded px-1 py-1 border border-[var(--border)]">
          <Calendar size={14} className="text-[var(--accent)] mx-1"/>
          <button onClick={() => setDayIdx((i) => Math.min(days.length - 1, i + 1))} disabled={dayIdx >= days.length - 1} className="text-[var(--text)] hover:text-[var(--accent-glow)] disabled:opacity-30 p-1" title="Older day (↓)"><ChevronLeft size={14}/></button>
          <span className="text-sm font-mono text-[var(--text)] min-w-[100px] text-center">{day?.date ?? "—"}</span>
          <button onClick={() => setDayIdx((i) => Math.max(0, i - 1))} disabled={dayIdx === 0} className="text-[var(--text)] hover:text-[var(--accent-glow)] disabled:opacity-30 p-1" title="Newer day (↑)"><ChevronRight size={14}/></button>
        </div>

        {/* Play */}
        <button onClick={togglePlay} disabled={frames.length < 2} className={`btn ${playing ? "btn-primary" : ""}`} title="Play time-lapse (space)">
          {playing ? <Pause size={14}/> : <Play size={14}/>}
          <span className="hidden sm:inline">{playing ? "Pause" : "Time-lapse"}</span>
        </button>

        <div className="ml-auto flex items-center gap-2 text-xs text-[var(--muted)]">
          <span><span className="text-[var(--accent-glow)] font-semibold">{frames.length}</span> frames today</span>
          <span>·</span>
          <span><span className="text-[var(--gold)] font-semibold">{sat?.total_frames ?? 0}</span> all-time</span>
        </div>

        <button
          onClick={() => stageRef.current?.requestFullscreen()}
          className="btn"
          title="Fullscreen (F)"
        ><Maximize size={14}/></button>
      </div>

      {/* Image stage — stacked frames with opacity toggle so playback is
          flicker-free once all frames are preloaded into the browser cache. */}
      <div
        ref={stageRef}
        className="card bg-black overflow-hidden relative"
        style={{ minHeight: 400, aspectRatio: "1 / 1", maxHeight: "calc(100dvh - 280px)" }}
      >
        {frames.length > 0 ? (
          <>
            {/* All frames stacked — only the active one is opacity:1. After
                preloading, every browser-side swap is just a CSS opacity flip
                with no network or JPEG decode. */}
            {frames.map((f, i) => (
              <img
                key={f.url}
                src={f.url}
                alt={i === frameIdx ? `${SAT_LABELS[satId]?.label ?? satId} · ${day.date} ${f.hhmm}` : ""}
                className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
                style={{ opacity: i === frameIdx ? 1 : 0 }}
                decoding="async"
                loading={Math.abs(i - frameIdx) <= 2 ? "eager" : "lazy"}
                draggable={false}
              />
            ))}

            {/* Info overlay */}
            <div className="absolute top-2 left-2 bg-[var(--bg-0)]/85 backdrop-blur rounded px-3 py-1.5 pointer-events-none">
              <div className="text-[10px] uppercase tracking-widest text-[var(--accent)]">{SAT_LABELS[satId]?.label ?? satId}</div>
              <div className="text-xs font-mono text-[var(--text)] mt-0.5">
                {day.date}  ·  <span className="text-[var(--accent-glow)]">{frame ? `${frame.hhmm.slice(0, 2)}:${frame.hhmm.slice(2)}` : "—"} UTC</span>
              </div>
            </div>
            <div className="absolute top-2 right-2 bg-[var(--bg-0)]/85 backdrop-blur rounded px-2 py-1 text-[11px] text-[var(--muted)] pointer-events-none">
              {frame ? fmtBytes(frame.size_bytes) : ""}
            </div>

            {/* Preload progress */}
            {preloadProgress && (
              <div className="absolute inset-x-0 bottom-12 mx-auto w-fit bg-[var(--bg-0)]/95 backdrop-blur border border-[var(--accent)] rounded-lg px-4 py-2 shadow-2xl pointer-events-none">
                <div className="text-[10px] uppercase tracking-widest text-[var(--accent)] mb-1">Buffering for smooth playback</div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-[var(--text)]">{preloadProgress.loaded} / {preloadProgress.total}</span>
                  <div className="w-32 h-1 bg-[var(--bg-1)] rounded overflow-hidden">
                    <div className="h-full bg-[var(--accent-glow)] transition-all" style={{ width: `${(preloadProgress.loaded / Math.max(1, preloadProgress.total)) * 100}%` }}/>
                  </div>
                </div>
              </div>
            )}

            {/* Download button */}
            {frame && (
              <a
                href={frame.url}
                download
                className="absolute bottom-2 right-2 bg-[var(--bg-0)]/85 backdrop-blur rounded px-2 py-1.5 text-[11px] text-[var(--text)] hover:text-[var(--accent-glow)] inline-flex items-center gap-1.5 z-10"
                title="Download this frame"
              >
                <Download size={12}/> JPEG
              </a>
            )}
          </>
        ) : (
          <div className="p-12 text-center text-[var(--muted)] text-sm">No frames for this day.</div>
        )}
      </div>

      {/* Time scrubber */}
      {frames.length > 0 && (
        <div className="card p-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest mb-1.5">
            <span className="text-[var(--muted)]">earliest today</span>
            <span className="text-[var(--accent-glow)] font-mono font-semibold">
              {frame ? `${frame.hhmm.slice(0, 2)}:${frame.hhmm.slice(2)} UTC` : "—"}
            </span>
            <span className="text-[var(--muted)]">latest today</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, frames.length - 1)}
            value={frameIdx}
            onChange={(e) => { setFrameIdx(parseInt(e.target.value)); if (playing) togglePlay(); }}
            className="w-full accent-[var(--accent-glow)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--muted)] font-mono mt-1">
            {frames.length > 0 && <>
              <span>{frames[0].hhmm.slice(0,2)}:{frames[0].hhmm.slice(2)}</span>
              <span>{frames[frames.length-1].hhmm.slice(0,2)}:{frames[frames.length-1].hhmm.slice(2)}</span>
            </>}
          </div>
        </div>
      )}

      {/* Filmstrip thumbnails */}
      {frames.length > 1 && (
        <div className="card p-3">
          <div className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-2">All frames today · click to jump</div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {frames.map((f, i) => (
              <button
                key={f.url}
                onClick={() => { setFrameIdx(i); if (playing) togglePlay(); }}
                className={`flex-shrink-0 relative rounded overflow-hidden border-2 transition-all ${i === frameIdx ? "border-[var(--accent)] scale-105" : "border-transparent hover:border-[var(--muted)] opacity-70 hover:opacity-100"}`}
                title={`${f.hhmm.slice(0,2)}:${f.hhmm.slice(2)} UTC · ${fmtBytes(f.size_bytes)}`}
              >
                <img src={f.url} alt="" className="w-20 h-20 object-cover block" loading="lazy"/>
                <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-[9px] font-mono text-white text-center py-0.5">
                  {f.hhmm.slice(0,2)}:{f.hhmm.slice(2)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      <div className="text-[10px] text-[var(--muted)] text-center">
        <kbd className="font-mono text-[var(--accent-glow)]">← →</kbd> frame ·
        <kbd className="font-mono text-[var(--accent-glow)] ml-2">↑ ↓</kbd> day ·
        <kbd className="font-mono text-[var(--accent-glow)] ml-2">space</kbd> play/pause ·
        <kbd className="font-mono text-[var(--accent-glow)] ml-2">F</kbd> fullscreen
      </div>
    </div>
  );
}
