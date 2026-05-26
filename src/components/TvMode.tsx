"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, ListFilter,
  Volume2, VolumeX, ChevronRight, ChevronLeft, Loader2, AlertCircle,
  Maximize, Gauge, ChevronsLeft, ChevronsRight, Camera, Download, Check,
} from "lucide-react";
import type { UapRecord } from "@/lib/types";
import { assetUrl } from "@/lib/asset-url";

type Props = { videos: UapRecord[] };

type LoadState = "idle" | "loading" | "buffering" | "ready" | "playing" | "error";

const SPEEDS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];
const ASSUMED_FPS = 30; // DVIDS UAP videos are mostly 29.97/30fps

function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TvMode({ videos }: Props) {
  const [order, setOrder] = useState<number[]>(() => videos.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(true);
  // Default muted so cascading autoplay across the queue is allowed by browsers.
  // User can unmute with M; once they do, all subsequent videos respect that choice.
  const [muted, setMuted] = useState(true);
  const [shuffle, setShuffle] = useState(false);
  const [loop, setLoop] = useState(true);
  const [filter, setFilter] = useState<"" | "VID" | "AUD">("");
  const [sidebar, setSidebar] = useState(true);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [bufferedPct, setBufferedPct] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [flash, setFlash] = useState<null | "shot" | "downloaded" | "blocked" | "error">(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const queue = useMemo(() => {
    const filtered = videos
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => !filter || v.type === filter);
    const indexes = filtered.map(({ i }) => i);
    if (shuffle) {
      // Fisher-Yates
      const a = [...indexes];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    return indexes;
  }, [videos, filter, shuffle]);

  // Reset position when queue changes
  useEffect(() => {
    setOrder(queue);
    setPos(0);
  }, [queue]);

  const currentIdx = order[pos];
  const current = currentIdx !== undefined ? videos[currentIdx] : undefined;

  // When the video source changes, reset UI state — but DON'T call play() yet.
  // The actual play() happens on the `canplay` event below, once the browser
  // confirms the media is ready. Calling play() immediately after a src change
  // races the load and silently fails on most browsers.
  useEffect(() => {
    if (!videoRef.current || !current) return;
    videoRef.current.muted = muted;
    videoRef.current.playbackRate = speed;
    setLoadState("loading");
    setBufferedPct(0);
    setCurrentTime(0);
    setDuration(0);
  }, [currentIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track loading / buffering / playback state for the UI
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onLoadStart = () => setLoadState("loading");
    const onWaiting = () => setLoadState((s) => (s === "playing" ? "buffering" : "loading"));
    const onCanPlay = () => {
      setLoadState((s) => (s === "playing" ? s : "ready"));
      // Now that the video is ready, honor the playing state
      if (playing && v.paused) {
        v.play().catch(() => {
          // Autoplay blocked because we're unmuted; mute and retry once
          if (!v.muted) {
            v.muted = true;
            setMuted(true);
            v.play().catch(() => setPlaying(false));
          } else {
            setPlaying(false);
          }
        });
      }
    };
    const onPlaying = () => setLoadState("playing");
    const onError = () => setLoadState("error");
    const onLoadedMeta = () => setDuration(v.duration || 0);
    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime);
      // Compute buffered % through the current playback position
      if (v.buffered.length > 0 && v.duration > 0) {
        const end = v.buffered.end(v.buffered.length - 1);
        setBufferedPct(Math.min(100, (end / v.duration) * 100));
      }
    };
    const onProgress = () => {
      if (v.buffered.length > 0 && v.duration > 0) {
        const end = v.buffered.end(v.buffered.length - 1);
        setBufferedPct(Math.min(100, (end / v.duration) * 100));
      }
    };

    v.addEventListener("loadstart", onLoadStart);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("error", onError);
    v.addEventListener("loadedmetadata", onLoadedMeta);
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("progress", onProgress);
    return () => {
      v.removeEventListener("loadstart", onLoadStart);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("error", onError);
      v.removeEventListener("loadedmetadata", onLoadedMeta);
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("progress", onProgress);
    };
    // Re-bind on playing/muted change so onCanPlay always reads current state
  }, [currentIdx, playing, muted]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    if (!videoRef.current) return;
    // Only honor playing=true if the video is past HAVE_FUTURE_DATA (readyState >= 3).
    // Otherwise the canplay handler above will auto-start once the media is ready.
    if (playing) {
      if (videoRef.current.readyState >= 3) {
        videoRef.current.play().catch(() => setPlaying(false));
      }
    } else {
      videoRef.current.pause();
    }
  }, [playing]);

  const goNext = () => {
    if (pos + 1 < order.length) setPos(pos + 1);
    else if (loop) setPos(0);
    else setPlaying(false);
  };
  const goPrev = () => {
    if (pos > 0) setPos(pos - 1);
    else if (loop) setPos(order.length - 1);
  };

  // Seek / frame-step / fullscreen helpers
  const seekTo = (sec: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || sec, sec));
  };
  const seekBy = (delta: number) => {
    if (!videoRef.current) return;
    seekTo(videoRef.current.currentTime + delta);
  };
  const frameStep = (frames: number) => {
    if (!videoRef.current) return;
    // Pause first; HTMLVideoElement doesn't have a native frame-step, so we
    // bump currentTime by 1/fps. Defaults to 30fps if we don't know the rate.
    videoRef.current.pause();
    setPlaying(false);
    seekBy(frames / ASSUMED_FPS);
  };
  const changeSpeed = (delta: number) => {
    const idx = SPEEDS.indexOf(speed);
    const next = idx >= 0 ? SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, idx + delta))] : 1;
    setSpeed(next);
  };
  const toggleFullscreen = async () => {
    if (!playerRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await playerRef.current.requestFullscreen();
  };

  // Pulse a brief on-screen confirmation so the user sees the action worked.
  const briefFlash = (kind: "shot" | "downloaded" | "blocked" | "error") => {
    setFlash(kind);
    setTimeout(() => setFlash(null), 2400);
  };

  // Slugify the title for a sensible filename
  const slug = (current?.title ?? "video")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  /**
   * Capture the current video frame to a PNG and trigger a download.
   * Pure browser-side — reads pixels from the already-loaded <video> element,
   * no bucket / network hit. If the browser blocks the canvas read because the
   * video came from a different origin (cross-origin taint), shows a friendly
   * tip pointing at the OS screenshot shortcut.
   */
  const takeScreenshot = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) {
      briefFlash("error");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      briefFlash("error");
      return;
    }
    try {
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      // toDataURL throws SecurityError synchronously on a tainted canvas;
      // toBlob would call its callback with null instead. Using toBlob and
      // checking for null covers both cases without an extra try.
      canvas.toBlob((blob) => {
        if (!blob) { briefFlash("blocked"); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slug}-t${v.currentTime.toFixed(2)}s.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        briefFlash("shot");
      }, "image/png");
    } catch {
      briefFlash("blocked");
    }
  };

  /**
   * Download the current MP4 directly via an <a download> click. The browser
   * may honor the download attribute and save the file, or open the video in
   * a new tab for cross-origin URLs (in which case the user can right-click
   * → Save Video As). No fetch / blob round-trip.
   */
  const downloadVideo = () => {
    if (!src) { briefFlash("error"); return; }
    const a = document.createElement("a");
    a.href = src;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    const ext = src.split("?")[0].split(".").pop() || "mp4";
    a.download = `${slug}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    briefFlash("downloaded");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space" || e.code === "KeyK") { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.code === "ArrowRight" && e.shiftKey) seekBy(5);
      else if (e.code === "ArrowLeft" && e.shiftKey) seekBy(-5);
      else if (e.code === "ArrowRight") goNext();
      else if (e.code === "ArrowLeft") goPrev();
      else if (e.code === "KeyJ") seekBy(-10);
      else if (e.code === "KeyL" && e.shiftKey) seekBy(10);
      else if (e.code === "Comma") { e.preventDefault(); frameStep(-1); }
      else if (e.code === "Period") { e.preventDefault(); frameStep(1); }
      else if (e.code === "KeyM") setMuted((m) => !m);
      else if (e.code === "KeyS") setShuffle((s) => !s);
      else if (e.code === "KeyL") setLoop((l) => !l);
      else if (e.code === "KeyB") setSidebar((s) => !s);
      else if (e.code === "KeyF") toggleFullscreen();
      else if (e.code === "Minus") changeSpeed(-1);
      else if (e.code === "Equal") changeSpeed(1);
      else if (e.code === "Digit0") setSpeed(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [order.length, pos, loop, speed]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) {
    return <div className="p-10 text-center text-[var(--muted)]">No videos match the current filter.</div>;
  }

  const src = current.dvids?.files?.[0]?.src
    ? assetUrl(current.dvids.files[0].src)
    : assetUrl(current.asset?.url);
  const poster = assetUrl(current.thumbnail?.url);

  // Size of the file we're loading, if known
  const fileSizeMB = current.dvids?.files?.[0]?.size
    ? (current.dvids.files[0].size / 1024 / 1024).toFixed(1)
    : null;

  const showOverlay = loadState === "loading" || loadState === "buffering" || loadState === "error";
  const overlayLabel =
    loadState === "loading" ? "Loading video"
    : loadState === "buffering" ? "Buffering"
    : loadState === "error" ? "Couldn’t load this video"
    : "";

  return (
    // Mobile: vertical stack, scroll the page. Desktop: fills `main` exactly (which
    // is sized by the app-shell layout in layout.tsx), no overflow.
    <div className="flex flex-col md:flex-row md:h-full md:overflow-hidden">
      {/* Player */}
      <div ref={playerRef} className="md:flex-1 md:min-w-0 flex flex-col bg-black relative md:min-h-0">
        {/*
          Video area. Mobile: fixed 16:9 aspect. Desktop: flex-1 + min-h-0 so it can
          shrink to make room for the controls below.
        */}
        <div className="relative aspect-video md:aspect-auto md:flex-1 md:min-h-0 z-0">
          <video
            key={currentIdx}
            ref={videoRef}
            src={src}
            poster={poster || undefined}
            preload="auto"
            className="w-full h-full object-contain bg-black"
            onEnded={goNext}
            playsInline
            controls={false}
          />
          {/* Brief confirmation flash for screenshot / download actions */}
          {flash && (
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none px-4">
              <div className={`px-4 py-2.5 rounded-md text-xs md:text-sm font-semibold flex items-center gap-2 backdrop-blur-md shadow-lg max-w-md text-center ${flash === "blocked" || flash === "error" ? "bg-[var(--pdf)]/85 text-white" : "bg-[var(--accent-glow)]/90 text-[var(--bg-0)]"}`}>
                {flash === "shot" && <><Check size={16}/> Screenshot saved</>}
                {flash === "downloaded" && <><Check size={16}/> Download started</>}
                {flash === "blocked" && <><AlertCircle size={16}/> Browser blocked the frame capture — use Win+Shift+S / Cmd+Shift+4 to grab the frame</>}
                {flash === "error" && <><AlertCircle size={16}/> Video not ready yet</>}
              </div>
            </div>
          )}
          {/* Loading / buffering / error overlay */}
          {showOverlay && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/70 backdrop-blur-sm rounded-lg px-6 py-5 flex flex-col items-center gap-3 max-w-md text-center pointer-events-auto">
                {loadState === "error" ? (
                  <AlertCircle size={32} className="text-[var(--pdf)]" />
                ) : (
                  <Loader2 size={32} className="text-[var(--accent-glow)] animate-spin" />
                )}
                <div className="text-sm font-semibold text-white">{overlayLabel}</div>
                {loadState !== "error" ? (
                  <>
                    <div className="text-[11px] text-[var(--muted)]">
                      {fileSizeMB ? `${fileSizeMB} MB · streaming from Linode Object Storage` : "Streaming from Linode Object Storage"}
                    </div>
                    {bufferedPct > 0 && (
                      <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent-glow)] transition-[width] duration-200"
                          style={{ width: `${bufferedPct.toFixed(0)}%` }}
                        />
                      </div>
                    )}
                    {bufferedPct > 0 && (
                      <div className="text-[10px] text-[var(--muted)]">{bufferedPct.toFixed(0)}% buffered</div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-[11px] text-[var(--muted)]">The video may not be fully uploaded to the bucket yet.</div>
                    <button type="button" onClick={goNext} className="btn btn-primary">
                      Skip to next →
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          {/* Progress / scrub bar (always visible at bottom of video area) */}
          {duration > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
              <div
                className="absolute top-0 left-0 h-full bg-white/15"
                style={{ width: `${bufferedPct}%` }}
              />
              <div
                className="absolute top-0 left-0 h-full bg-[var(--accent-glow)]"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
          )}
          {/* Overlay info */}
          <div className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 flex items-start justify-between gap-2 pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm px-3 py-2 md:px-4 md:py-3 rounded-md pointer-events-auto max-w-[70%] md:max-w-xl">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`chip chip-${current.type}`}>{current.type}</span>
                <span className="text-[10px] tracking-widest text-[var(--muted)] uppercase">
                  {pos + 1} / {order.length} · {current.agency}
                </span>
              </div>
              <h2 className="text-sm md:text-lg font-bold leading-tight text-white line-clamp-2 md:line-clamp-none">{current.title}</h2>
              {current.incidentLocation && current.incidentLocation !== "N/A" && (
                <div className="text-[10px] md:text-xs text-[var(--muted)] mt-1 hidden md:block">
                  {current.incidentLocation} · {current.incidentDate}
                </div>
              )}
            </div>
            <Link href={`/records/${current.id}`} className="btn pointer-events-auto text-[10px] md:text-sm px-2 md:px-3 py-1 md:py-2">
              <span className="hidden sm:inline">Open details </span>→
            </Link>
          </div>
        </div>

        {/*
          Full media controls. flex-shrink-0 + relative z-10 guarantees this bar
          always renders below the video (in document flow) at its natural height,
          even if the video element does something unexpected with sizing.
        */}
        <div className="flex-shrink-0 relative z-10 bg-[var(--bg-0)] border-t border-[var(--border)] flex flex-col">
          {/* Scrubber row */}
          <div className="px-3 md:px-6 pt-3 flex items-center gap-2 md:gap-3">
            <span className="text-[10px] md:text-xs font-mono text-[var(--muted)] tabular-nums w-10 md:w-12 text-right">
              {fmtTime(currentTime)}
            </span>
            <div className="flex-1 relative h-6 md:h-5 flex items-center group">
              {/* Buffered + filled track behind the slider */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 bg-white/8 rounded-full overflow-hidden pointer-events-none">
                <div
                  className="absolute top-0 left-0 h-full bg-white/15"
                  style={{ width: `${bufferedPct}%` }}
                />
                <div
                  className="absolute top-0 left-0 h-full bg-[var(--accent-glow)] transition-[width] duration-100"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.01}
                value={currentTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="relative w-full h-6 md:h-5 appearance-none bg-transparent cursor-pointer touch-none
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:w-4
                           md:[&::-webkit-slider-thumb]:h-3
                           md:[&::-webkit-slider-thumb]:w-3
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-[var(--accent-glow)]
                           [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(94,234,212,0.8)]
                           [&::-moz-range-thumb]:h-4
                           [&::-moz-range-thumb]:w-4
                           md:[&::-moz-range-thumb]:h-3
                           md:[&::-moz-range-thumb]:w-3
                           [&::-moz-range-thumb]:border-0
                           [&::-moz-range-thumb]:rounded-full
                           [&::-moz-range-thumb]:bg-[var(--accent-glow)]
                           opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 transition"
                aria-label="Seek"
              />
            </div>
            <span className="text-[10px] md:text-xs font-mono text-[var(--muted)] tabular-nums w-10 md:w-12">
              {fmtTime(duration)}
            </span>
          </div>

          {/* Button row — scrollable horizontally on mobile if it overflows */}
          <div className="px-3 md:px-6 py-2 md:py-3 flex items-center gap-1.5 md:gap-2 overflow-x-auto md:flex-wrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button type="button" onClick={goPrev} className="btn" title="Previous video (←)"><SkipBack size={14}/></button>
            <button type="button" onClick={() => frameStep(-1)} className="btn" title="Frame back (,)">
              <ChevronsLeft size={14}/>
            </button>
            <button type="button" onClick={() => setPlaying((p) => !p)} className="btn btn-primary" title="Play / pause (space or K)">
              {playing ? <Pause size={14}/> : <Play size={14}/>}
            </button>
            <button type="button" onClick={() => frameStep(1)} className="btn" title="Frame forward (.)">
              <ChevronsRight size={14}/>
            </button>
            <button type="button" onClick={goNext} className="btn" title="Next video (→)"><SkipForward size={14}/></button>

            <div className="w-px h-6 bg-[var(--border)] mx-1"/>

            <button type="button" onClick={() => seekBy(-10)} className="btn text-[10px] font-mono" title="Back 10 seconds (J)">-10s</button>
            <button type="button" onClick={() => seekBy(-5)} className="btn text-[10px] font-mono" title="Back 5 seconds (Shift+←)">-5s</button>
            <button type="button" onClick={() => seekBy(5)} className="btn text-[10px] font-mono" title="Forward 5 seconds (Shift+→)">+5s</button>
            <button type="button" onClick={() => seekBy(10)} className="btn text-[10px] font-mono" title="Forward 10 seconds (Shift+L)">+10s</button>

            <div className="w-px h-6 bg-[var(--border)] mx-1"/>

            <div className="flex items-center gap-1.5">
              <Gauge size={14} className={speed === 1 ? "text-[var(--muted)]" : "text-[var(--gold)]"}/>
              <select
                value={String(speed)}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="select text-xs"
                title="Playback speed (- / + to nudge, 0 to reset)"
              >
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>{s}× {s < 1 ? "slow" : s > 1 ? "fast" : "normal"}</option>
                ))}
              </select>
            </div>

            <button type="button" onClick={() => setMuted((m) => !m)} className="btn" title="Mute (M)">
              {muted ? <VolumeX size={14}/> : <Volume2 size={14}/>}
            </button>

            <div className="w-px h-6 bg-[var(--border)] mx-1"/>

            <button type="button" onClick={takeScreenshot} className="btn" title="Save screenshot of current frame as PNG">
              <Camera size={14}/> <span className="hidden sm:inline">Screenshot</span>
            </button>
            <button type="button" onClick={downloadVideo} className="btn" title="Download this video to your computer">
              <Download size={14}/> <span className="hidden sm:inline">Download</span>
            </button>

            <div className="w-px h-6 bg-[var(--border)] mx-1"/>

            <button type="button" onClick={() => setShuffle((s) => !s)} className={`btn ${shuffle ? "btn-gold" : ""}`} title="Shuffle queue (S)">
              <Shuffle size={14}/>
            </button>
            <button type="button" onClick={() => setLoop((l) => !l)} className={`btn ${loop ? "btn-primary" : ""}`} title="Loop queue (L)">
              <Repeat size={14}/>
            </button>
            <select value={filter} onChange={(e) => setFilter(e.target.value as "" | "VID" | "AUD")} className="select text-xs" title="Filter queue by type">
              <option value="">All ({videos.length})</option>
              <option value="VID">Videos ({videos.filter(v => v.type === "VID").length})</option>
              <option value="AUD">Audio ({videos.filter(v => v.type === "AUD").length})</option>
            </select>

            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={toggleFullscreen} className="btn" title="Fullscreen (F)"><Maximize size={14}/></button>
              <button type="button" onClick={() => setSidebar((s) => !s)} className="btn" title="Toggle queue sidebar (B)">
                {sidebar ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
              </button>
            </div>
          </div>

          {/* Keyboard help row — hidden on mobile (no keyboard) */}
          <div className="hidden md:flex px-6 pb-2 text-[10px] text-[var(--muted)] tracking-wider flex-wrap gap-x-4 gap-y-1">
            <span><kbd className="font-mono text-[var(--accent-glow)]">space</kbd> play/pause</span>
            <span><kbd className="font-mono text-[var(--accent-glow)]">← →</kbd> prev/next video</span>
            <span><kbd className="font-mono text-[var(--accent-glow)]">shift+←/→</kbd> ±5s</span>
            <span><kbd className="font-mono text-[var(--accent-glow)]">J / shift+L</kbd> ±10s</span>
            <span><kbd className="font-mono text-[var(--accent-glow)]">,  /  .</kbd> frame back/forward</span>
            <span><kbd className="font-mono text-[var(--accent-glow)]">−  /  =</kbd> speed</span>
            <span><kbd className="font-mono text-[var(--accent-glow)]">0</kbd> 1× speed</span>
            <span><kbd className="font-mono text-[var(--accent-glow)]">M</kbd> mute</span>
            <span><kbd className="font-mono text-[var(--accent-glow)]">F</kbd> fullscreen</span>
            <span><kbd className="font-mono text-[var(--accent-glow)]">S</kbd> shuffle</span>
            <span><kbd className="font-mono text-[var(--accent-glow)]">L</kbd> loop</span>
            <span><kbd className="font-mono text-[var(--accent-glow)]">B</kbd> sidebar</span>
          </div>
        </div>
      </div>

      {/* Queue sidebar — full-width below player on mobile, fixed-width sidebar on desktop */}
      {sidebar && (
        <aside className="w-full md:w-[340px] border-t md:border-t-0 md:border-l border-[var(--border)] bg-[var(--bg-1)] md:overflow-y-auto md:max-h-full max-h-[60vh] overflow-y-auto">
          <div className="p-3 border-b border-[var(--border)] flex items-center gap-2 sticky top-0 bg-[var(--bg-1)] z-10">
            <ListFilter size={14} className="text-[var(--accent)]"/>
            <span className="text-xs uppercase tracking-widest text-[var(--accent)]">Up Next</span>
            <span className="text-xs text-[var(--muted)] ml-auto">{order.length} items</span>
          </div>
          <ul>
            {order.map((vIdx, qIdx) => {
              const v = videos[vIdx];
              const t = assetUrl(v.thumbnail?.url);
              const active = qIdx === pos;
              return (
                <li key={`${vIdx}-${qIdx}`}>
                  <button
                    type="button"
                    onClick={() => setPos(qIdx)}
                    className={`w-full text-left flex items-center gap-2 p-2 border-b border-[var(--border)] hover:bg-[var(--bg-2)] transition ${active ? "bg-[var(--bg-2)]" : ""}`}
                  >
                    <div className="w-[70px] h-[44px] bg-black rounded overflow-hidden flex-shrink-0 relative">
                      {t && <img src={t} alt="" className="w-full h-full object-cover"/>}
                      {active && <div className="absolute inset-0 bg-[var(--accent)]/30 flex items-center justify-center"><Play size={14} className="text-white"/></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-[var(--text)] truncate">{v.title}</div>
                      <div className="text-[10px] text-[var(--muted)] truncate">
                        {v.agency} · {v.incidentLocation && v.incidentLocation !== "N/A" ? v.incidentLocation : v.incidentDate}
                      </div>
                    </div>
                    <span className={`chip chip-${v.type} text-[8px]`}>{v.type}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      )}
    </div>
  );
}
