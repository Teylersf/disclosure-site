"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, ListFilter,
  Volume2, VolumeX, ChevronRight, ChevronLeft, Loader2, AlertCircle,
} from "lucide-react";
import type { UapRecord } from "@/lib/types";
import { assetUrl } from "@/lib/asset-url";

type Props = { videos: UapRecord[] };

type LoadState = "idle" | "loading" | "buffering" | "ready" | "playing" | "error";

export default function TvMode({ videos }: Props) {
  const [order, setOrder] = useState<number[]>(() => videos.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [loop, setLoop] = useState(true);
  const [filter, setFilter] = useState<"" | "VID" | "AUD">("");
  const [sidebar, setSidebar] = useState(true);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [bufferedPct, setBufferedPct] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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

  // When video element source changes, autoplay
  useEffect(() => {
    if (!videoRef.current || !current) return;
    videoRef.current.muted = muted;
    setLoadState("loading");
    setBufferedPct(0);
    setCurrentTime(0);
    setDuration(0);
    if (playing) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked; mute and try again
        if (videoRef.current) {
          videoRef.current.muted = true;
          setMuted(true);
          videoRef.current.play().catch(() => setPlaying(false));
        }
      });
    } else {
      videoRef.current.pause();
    }
  }, [currentIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track loading / buffering / playback state for the UI
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onLoadStart = () => setLoadState("loading");
    const onWaiting = () => setLoadState((s) => (s === "playing" ? "buffering" : "loading"));
    const onCanPlay = () => setLoadState((s) => (s === "playing" ? s : "ready"));
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
  }, [currentIdx]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.play().catch(() => setPlaying(false));
    else videoRef.current.pause();
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

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.code === "Space") { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.code === "ArrowRight") goNext();
      else if (e.code === "ArrowLeft") goPrev();
      else if (e.code === "KeyM") setMuted((m) => !m);
      else if (e.code === "KeyS") setShuffle((s) => !s);
      else if (e.code === "KeyL") setLoop((l) => !l);
      else if (e.code === "KeyB") setSidebar((s) => !s);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [order.length, pos, loop]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="flex h-[calc(100vh-65px)] overflow-hidden">
      {/* Player */}
      <div className="flex-1 flex flex-col bg-black relative">
        <div className="flex-1 relative">
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
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm px-4 py-3 rounded-md pointer-events-auto max-w-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className={`chip chip-${current.type}`}>{current.type}</span>
                <span className="text-[10px] tracking-widest text-[var(--muted)] uppercase">
                  {pos + 1} / {order.length} · {current.agency}
                </span>
              </div>
              <h2 className="text-lg font-bold leading-tight text-white">{current.title}</h2>
              {current.incidentLocation && current.incidentLocation !== "N/A" && (
                <div className="text-xs text-[var(--muted)] mt-1">
                  {current.incidentLocation} · {current.incidentDate}
                </div>
              )}
            </div>
            <Link href={`/records/${current.id}`} className="btn pointer-events-auto">
              Open details →
            </Link>
          </div>
        </div>

        {/* Controls bar */}
        <div className="bg-[var(--bg-0)] border-t border-[var(--border)] px-6 py-3 flex items-center gap-3">
          <button type="button" onClick={goPrev} className="btn" title="Previous (←)"><SkipBack size={14}/></button>
          <button type="button" onClick={() => setPlaying((p) => !p)} className="btn btn-primary" title="Play/pause (space)">
            {playing ? <Pause size={14}/> : <Play size={14}/>}
          </button>
          <button type="button" onClick={goNext} className="btn" title="Next (→)"><SkipForward size={14}/></button>
          <div className="w-px h-6 bg-[var(--border)] mx-2"/>
          <button type="button" onClick={() => setMuted((m) => !m)} className="btn" title="Mute (M)">
            {muted ? <VolumeX size={14}/> : <Volume2 size={14}/>}
          </button>
          <button type="button" onClick={() => setShuffle((s) => !s)} className={`btn ${shuffle ? "btn-gold" : ""}`} title="Shuffle (S)">
            <Shuffle size={14}/>
          </button>
          <button type="button" onClick={() => setLoop((l) => !l)} className={`btn ${loop ? "btn-primary" : ""}`} title="Loop (L)">
            <Repeat size={14}/>
          </button>
          <select value={filter} onChange={(e) => setFilter(e.target.value as "" | "VID" | "AUD")} className="select text-xs">
            <option value="">All ({videos.length})</option>
            <option value="VID">Videos ({videos.filter(v => v.type === "VID").length})</option>
            <option value="AUD">Audio ({videos.filter(v => v.type === "AUD").length})</option>
          </select>
          <div className="ml-auto flex items-center gap-3 text-[10px] uppercase tracking-widest text-[var(--muted)]">
            <span>Space · ← → · M · S · L · B</span>
            <button type="button" onClick={() => setSidebar((s) => !s)} className="btn" title="Toggle sidebar (B)">
              {sidebar ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
            </button>
          </div>
        </div>
      </div>

      {/* Queue sidebar */}
      {sidebar && (
        <aside className="w-[340px] border-l border-[var(--border)] bg-[var(--bg-1)] overflow-y-auto">
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
