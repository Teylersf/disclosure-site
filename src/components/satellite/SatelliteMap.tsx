"use client";

/**
 * Satellite map — cinematic full-bleed layout.
 *
 * Layout:
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │ 📅 Mon May 29 2026  [◀ ▶]  [Today]    [Layer: VIIRS NOAA-20 ▾]    │
 *   ├────────────────────────────────────────────────────────────────────┤
 *   │                                                                    │
 *   │                              MAP                                   │
 *   │                                                                    │
 *   │ ┌──────┐                                       ┌──┐ ┌──┐ ┌──┐ ┌──┐ │
 *   │ │ ▶ ▮▮ │                                       │+ │ │− │ │📷│ │⛶│ │
 *   │ └──────┘                                       └──┘ └──┘ └──┘ └──┘ │
 *   │ ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 *   Drawer (opens from right when "Layer ▾" clicked):
 *     - Search bar
 *     - Layers grouped by category
 *     - Click row → set as base + close drawer
 *     - Eye toggle → add as overlay (slider for opacity)
 *
 * Keyboard:
 *   ← →     step day
 *   Space   play / pause time-lapse
 *   + −     zoom
 *   0       reset view
 *   F       fullscreen
 *   S       screenshot
 *   L       toggle layer drawer
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import XYZ from "ol/source/XYZ";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Style, Circle, Fill, Stroke, Text } from "ol/style";
import Overlay from "ol/Overlay";
import "ol/ol.css";

import {
  GIBS_LAYERS, LAYER_GROUPS, getLayer,
  DEFAULT_BASE_LAYER, DEFAULT_OVERLAYS, type GibsLayer,
} from "@/lib/gibs-layers";
import { INCIDENT_AOIS, type IncidentAoi } from "@/lib/satellite-aois";
import {
  Calendar, Layers as LayersIcon, ChevronLeft, ChevronRight, Maximize, Camera,
  Search, X, Eye, EyeOff, Plus, Minus, Play, Pause, ChevronDown, MapPin,
} from "lucide-react";


function ymd(d: Date): string { return d.toISOString().slice(0, 10); }
function nice(d: string): string {
  const dt = new Date(d + "T00:00:00Z");
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
function clampDate(s: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return ymd(new Date(Date.now() - 86400000));
  return s;
}


function makeXyz(layer: GibsLayer, date: string) {
  return new XYZ({
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${layer.layer}/default/${date}/${layer.matrixSet}/{z}/{y}/{x}.${layer.ext}`,
    crossOrigin: "anonymous",
    tileLoadFunction: (imageTile, _src) => {
      const coord = (imageTile as unknown as { getTileCoord: () => [number, number, number] }).getTileCoord();
      const [z, x, y] = coord;
      const url = `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${layer.layer}/default/${date}/${layer.matrixSet}/${z}/${y}/${x}.${layer.ext}`;
      const img = (imageTile as unknown as { getImage: () => HTMLImageElement }).getImage();
      img.src = url;
    },
    maxZoom: layer.matrixSet === "250m" ? 9 : layer.matrixSet === "500m" ? 8 : layer.matrixSet === "1km" ? 7 : layer.matrixSet === "2km" ? 6 : 9,
    projection: "EPSG:4326",
  });
}

interface SatelliteMapProps {
  initialDate?: string;
  initialBase?: string;
  initialOverlays?: string[];
}

export default function SatelliteMap({ initialDate, initialBase, initialOverlays }: SatelliteMapProps) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const baseLayerRef = useRef<TileLayer | null>(null);
  const overlaysRegistry = useRef<Record<string, TileLayer>>({});
  const popupOverlayRef = useRef<Overlay | null>(null);
  const playTimerRef = useRef<number | null>(null);

  const today = useMemo(() => ymd(new Date(Date.now() - 86400000)), []);
  const [date, setDate] = useState<string>(initialDate ?? today);
  const [baseId, setBaseId] = useState<string>(initialBase ?? DEFAULT_BASE_LAYER);
  const [overlayIds, setOverlayIds] = useState<string[]>(initialOverlays ?? DEFAULT_OVERLAYS);
  const [overlayOpacity, setOverlayOpacity] = useState<Record<string, number>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [popupAoi, setPopupAoi] = useState<IncidentAoi | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showAois, setShowAois] = useState(true);

  // ---- Map init ----
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const base = getLayer(baseId)!;
    const baseLayer = new TileLayer({
      source: makeXyz(base, clampDate(date)),
      properties: { gibsId: base.id },
    });
    baseLayerRef.current = baseLayer;

    const aoiSource = new VectorSource({
      features: INCIDENT_AOIS.map((a) => {
        const f = new Feature({ geometry: new Point([a.lng, a.lat]), aoi: a });
        f.setId(a.id);
        return f;
      }),
    });
    const aoiLayer = new VectorLayer({
      source: aoiSource,
      visible: showAois,
      style: (feat) => new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({ color: "rgba(255, 209, 102, 0.9)" }),
          stroke: new Stroke({ color: "#050610", width: 2.5 }),
        }),
        text: new Text({
          text: ((feat.get("aoi") as IncidentAoi).name).split(",")[0],
          offsetY: -16,
          font: "bold 11px ui-sans-serif, system-ui",
          fill: new Fill({ color: "#FFF" }),
          stroke: new Stroke({ color: "#050610", width: 3 }),
        }),
      }),
      zIndex: 999,
    });
    aoiLayer.set("isAoi", true);

    const map = new Map({
      target: mapDivRef.current,
      layers: [baseLayer, aoiLayer],
      view: new View({
        projection: "EPSG:4326",
        center: [0, 20],
        zoom: 2,
        minZoom: 1,
        maxZoom: 9,
      }),
      controls: [],
    });

    if (popupRef.current) {
      const popOverlay = new Overlay({
        element: popupRef.current,
        positioning: "bottom-center",
        offset: [0, -16],
        stopEvent: true,
      });
      map.addOverlay(popOverlay);
      popupOverlayRef.current = popOverlay;
    }

    map.on("singleclick", (evt) => {
      const f = map.forEachFeatureAtPixel(evt.pixel, (feat) => feat as Feature);
      if (f) {
        const aoi = f.get("aoi") as IncidentAoi;
        const geom = f.getGeometry() as Point;
        setPopupAoi(aoi);
        popupOverlayRef.current?.setPosition(geom.getCoordinates());
      } else {
        setPopupAoi(null);
        popupOverlayRef.current?.setPosition(undefined);
      }
    });

    mapRef.current = map;

    for (const oid of overlayIds) {
      const layer = getLayer(oid);
      if (!layer) continue;
      const tl = new TileLayer({ source: makeXyz(layer, clampDate(date)), opacity: 1, properties: { gibsId: layer.id } });
      overlaysRegistry.current[oid] = tl;
      map.getLayers().insertAt(map.getLayers().getLength() - 1, tl);
    }

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      overlaysRegistry.current = {};
      if (playTimerRef.current != null) window.clearInterval(playTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync AOI visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getLayers().forEach((l) => {
      if (l.get("isAoi")) l.setVisible(showAois);
    });
  }, [showAois]);

  // ---- React to baseId / date changes ----
  useEffect(() => {
    const map = mapRef.current;
    const baseLayer = baseLayerRef.current;
    if (!map || !baseLayer) return;
    const base = getLayer(baseId);
    if (!base) return;
    baseLayer.setSource(makeXyz(base, clampDate(date)));
    baseLayer.set("gibsId", base.id);
    for (const [oid, tl] of Object.entries(overlaysRegistry.current)) {
      const ol = getLayer(oid);
      if (!ol) continue;
      tl.setSource(makeXyz(ol, clampDate(date)));
    }
  }, [baseId, date]);

  // ---- Overlay toggle ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const visible = new Set(overlayIds);
    for (const [oid, tl] of Object.entries(overlaysRegistry.current)) {
      if (!visible.has(oid)) {
        map.removeLayer(tl);
        delete overlaysRegistry.current[oid];
      }
    }
    for (const oid of overlayIds) {
      if (overlaysRegistry.current[oid]) continue;
      const layer = getLayer(oid);
      if (!layer) continue;
      const op = overlayOpacity[oid] ?? 1;
      const tl = new TileLayer({ source: makeXyz(layer, clampDate(date)), opacity: op, properties: { gibsId: layer.id } });
      overlaysRegistry.current[oid] = tl;
      map.getLayers().insertAt(map.getLayers().getLength() - 1, tl);
    }
  }, [overlayIds]);

  // ---- Opacity ----
  useEffect(() => {
    for (const [oid, tl] of Object.entries(overlaysRegistry.current)) {
      tl.setOpacity(overlayOpacity[oid] ?? 1);
    }
  }, [overlayOpacity]);

  // ---- URL state ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("date", date);
    url.searchParams.set("base", baseId);
    if (overlayIds.length > 0) url.searchParams.set("overlays", overlayIds.join(",")); else url.searchParams.delete("overlays");
    window.history.replaceState({}, "", url.toString());
  }, [date, baseId, overlayIds]);

  // ---- Day stepping ----
  const stepDay = useCallback((delta: number) => {
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + delta);
    if (d > new Date()) return;
    setDate(ymd(d));
  }, [date]);

  // ---- Play / pause time-lapse ----
  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (p) {
        if (playTimerRef.current != null) {
          window.clearInterval(playTimerRef.current);
          playTimerRef.current = null;
        }
        return false;
      }
      playTimerRef.current = window.setInterval(() => {
        setDate((cur) => {
          const d = new Date(cur + "T00:00:00Z");
          d.setUTCDate(d.getUTCDate() + 1);
          if (d > new Date()) return cur;
          return ymd(d);
        });
      }, 700);
      return true;
    });
  }, []);

  // Stop playing if drawer opens
  useEffect(() => {
    if (drawerOpen && playing) togglePlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);

  // ---- Keyboard ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = (e.target as HTMLElement)?.tagName;
      if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); stepDay(-1); break;
        case "ArrowRight": e.preventDefault(); stepDay(1); break;
        case " ": e.preventDefault(); togglePlay(); break;
        case "+": case "=": mapRef.current?.getView().animate({ zoom: (mapRef.current.getView().getZoom() ?? 2) + 1, duration: 250 }); break;
        case "-": case "_": mapRef.current?.getView().animate({ zoom: (mapRef.current.getView().getZoom() ?? 2) - 1, duration: 250 }); break;
        case "0": resetView(); break;
        case "f": case "F": toggleFullscreen(); break;
        case "s": case "S": e.preventDefault(); screenshot(); break;
        case "l": case "L": setDrawerOpen((d) => !d); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepDay, togglePlay]);

  const resetView = useCallback(() => {
    mapRef.current?.getView().animate({ center: [0, 20], zoom: 2, duration: 400 });
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = mapDivRef.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  }, []);

  const screenshot = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.once("rendercomplete", () => {
      const canvases = map.getViewport().querySelectorAll("canvas") as NodeListOf<HTMLCanvasElement>;
      if (canvases.length === 0) return;
      const w = canvases[0].width, h = canvases[0].height;
      const out = document.createElement("canvas");
      out.width = w; out.height = h;
      const ctx = out.getContext("2d")!;
      for (const c of Array.from(canvases)) ctx.drawImage(c, 0, 0);
      out.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pursue-satellite-${date}-${baseId}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png");
    });
    map.renderSync();
  }, [date, baseId]);

  const base = getLayer(baseId);

  // Time-scrubber position (last 30 days)
  const dayOffset = useMemo(() => {
    const d = new Date(date + "T00:00:00Z");
    const ms = Date.now() - d.getTime();
    return Math.max(0, Math.min(29, Math.round(ms / 86400000) - 1));
  }, [date]);

  const setByOffset = (offset: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1 - offset);
    setDate(ymd(d));
  };

  // Filter for picker
  const filteredLayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return GIBS_LAYERS;
    return GIBS_LAYERS.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      l.blurb.toLowerCase().includes(q) ||
      l.group.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-lg border border-[var(--border)]">
      {/* The map fills the entire container */}
      <div ref={mapDivRef} className="absolute inset-0" />

      {/* Top floating bar — date + active layer */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap gap-2 items-start pointer-events-none">
        {/* Date */}
        <div className="bg-[var(--bg-0)]/90 backdrop-blur border border-[var(--border)] rounded-lg shadow-2xl pointer-events-auto flex items-center gap-1 px-1.5 py-1">
          <Calendar size={14} className="text-[var(--accent)] mx-1.5"/>
          <button onClick={() => stepDay(-1)} className="text-[var(--text)] hover:text-[var(--accent-glow)] p-1.5" title="Previous day (←)"><ChevronLeft size={14}/></button>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-[var(--text)] text-sm font-mono outline-none w-32 text-center"
          />
          <button onClick={() => stepDay(1)} disabled={date >= today} className="text-[var(--text)] hover:text-[var(--accent-glow)] disabled:opacity-30 p-1.5" title="Next day (→)"><ChevronRight size={14}/></button>
          <button onClick={() => setDate(today)} className="text-[10px] uppercase tracking-widest text-[var(--accent-glow)] px-2 py-1 rounded hover:bg-[var(--bg-1)]">Today</button>
        </div>

        {/* Active layer pill — opens the drawer */}
        <button
          onClick={() => setDrawerOpen((d) => !d)}
          className="bg-[var(--bg-0)]/90 backdrop-blur border border-[var(--border)] rounded-lg shadow-2xl pointer-events-auto flex items-center gap-2 px-3 py-2 hover:border-[var(--accent)] transition-colors group min-w-0 max-w-[60vw]"
          title="Change layer (L)"
        >
          <LayersIcon size={14} className="text-[var(--accent)] flex-shrink-0"/>
          <span className="text-[10px] uppercase tracking-widest text-[var(--muted)] flex-shrink-0">Layer:</span>
          <span className="text-sm text-[var(--text)] font-medium truncate">{base?.name ?? baseId}</span>
          {overlayIds.length > 0 && (
            <span className="text-[10px] text-[var(--gold)] flex-shrink-0">+{overlayIds.length}</span>
          )}
          <ChevronDown size={12} className={`text-[var(--muted)] group-hover:text-[var(--accent)] transition-transform flex-shrink-0 ${drawerOpen ? "rotate-180" : ""}`}/>
        </button>

        {/* AOI toggle pill */}
        <button
          onClick={() => setShowAois((v) => !v)}
          className={`bg-[var(--bg-0)]/90 backdrop-blur border rounded-lg shadow-2xl pointer-events-auto flex items-center gap-2 px-3 py-2 transition-colors ${showAois ? "border-[var(--gold)] text-[var(--gold)]" : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]"}`}
          title={`${showAois ? "Hide" : "Show"} 12 UAP incident sites`}
        >
          <MapPin size={14}/>
          <span className="text-[10px] uppercase tracking-widest">{showAois ? "12 sites" : "Show sites"}</span>
        </button>
      </div>

      {/* Bottom-left: play / pause */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-2 pointer-events-none">
        <button
          onClick={togglePlay}
          className="bg-[var(--bg-0)]/90 backdrop-blur border border-[var(--border)] rounded-lg shadow-2xl pointer-events-auto flex items-center gap-2 px-3 py-2 hover:border-[var(--accent)]"
          title={playing ? "Pause (space)" : "Play time-lapse (space)"}
        >
          {playing ? <Pause size={14} className="text-[var(--accent-glow)]"/> : <Play size={14} className="text-[var(--accent-glow)]"/>}
          <span className="text-xs text-[var(--text)]">{playing ? "Pause" : "Time-lapse"}</span>
        </button>
      </div>

      {/* Bottom-right: zoom + screenshot + fullscreen */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1 pointer-events-none">
        <div className="bg-[var(--bg-0)]/90 backdrop-blur border border-[var(--border)] rounded-lg shadow-2xl pointer-events-auto flex flex-col">
          <button onClick={() => mapRef.current?.getView().animate({ zoom: (mapRef.current.getView().getZoom() ?? 2) + 1, duration: 250 })} className="p-2.5 hover:bg-[var(--bg-1)] border-b border-[var(--border)] rounded-t-lg" title="Zoom in (+)"><Plus size={14}/></button>
          <button onClick={() => mapRef.current?.getView().animate({ zoom: (mapRef.current.getView().getZoom() ?? 2) - 1, duration: 250 })} className="p-2.5 hover:bg-[var(--bg-1)] rounded-b-lg" title="Zoom out (-)"><Minus size={14}/></button>
        </div>
        <div className="bg-[var(--bg-0)]/90 backdrop-blur border border-[var(--border)] rounded-lg shadow-2xl pointer-events-auto flex flex-col">
          <button onClick={screenshot} className="p-2.5 hover:bg-[var(--bg-1)] border-b border-[var(--border)] rounded-t-lg" title="Screenshot (S)"><Camera size={14}/></button>
          <button onClick={toggleFullscreen} className="p-2.5 hover:bg-[var(--bg-1)] rounded-b-lg" title="Fullscreen (F)"><Maximize size={14}/></button>
        </div>
      </div>

      {/* Bottom time scrubber bar — last 30 days */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none w-full max-w-md px-12">
        <div className="bg-[var(--bg-0)]/90 backdrop-blur border border-[var(--border)] rounded-lg shadow-2xl pointer-events-auto px-3 py-2">
          <div className="flex items-center justify-between text-[10px] text-[var(--muted)] mb-1 font-mono">
            <span>30 days ago</span>
            <span className="text-[var(--accent-glow)] font-semibold">{nice(date)}</span>
            <span>yesterday</span>
          </div>
          <input
            type="range"
            min={0}
            max={29}
            value={29 - dayOffset}
            onChange={(e) => setByOffset(29 - parseInt(e.target.value))}
            className="w-full accent-[var(--accent-glow)]"
          />
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="absolute top-1/2 right-3 -translate-y-1/2 z-10 text-[9px] text-[var(--muted)] bg-[var(--bg-0)]/70 backdrop-blur px-2 py-1.5 rounded pointer-events-none hidden xl:block">
        <div><kbd className="text-[var(--accent-glow)]">← →</kbd> day</div>
        <div><kbd className="text-[var(--accent-glow)]">space</kbd> play</div>
        <div><kbd className="text-[var(--accent-glow)]">L</kbd> layers</div>
        <div><kbd className="text-[var(--accent-glow)]">+/-</kbd> zoom</div>
        <div><kbd className="text-[var(--accent-glow)]">S</kbd> shot</div>
        <div><kbd className="text-[var(--accent-glow)]">F</kbd> full</div>
      </div>

      {/* AOI popup */}
      <div ref={popupRef} style={{ position: "absolute", pointerEvents: "auto" }}>
        {popupAoi && (
          <div className="bg-[var(--bg-0)]/95 backdrop-blur border border-[var(--accent)] rounded-lg shadow-2xl px-3 py-2.5 text-xs max-w-[280px]" style={{ transform: "translate(-50%, -100%)" }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-widest text-[var(--gold)]">UAP incident site</div>
              <button onClick={() => { setPopupAoi(null); popupOverlayRef.current?.setPosition(undefined); }} className="text-[var(--muted)] hover:text-[var(--text)]"><X size={12}/></button>
            </div>
            <div className="font-semibold text-[var(--text)] mb-1.5">{popupAoi.name}</div>
            <div className="text-[var(--muted)] mb-2.5 leading-snug">{popupAoi.context}</div>
            <Link href={`/satellite/incident/${popupAoi.id}`} className="btn btn-primary text-[11px] w-full justify-center">Open day-scrubber →</Link>
          </div>
        )}
      </div>

      {/* Layer drawer — slides in from the right */}
      <div className={`absolute top-0 right-0 bottom-0 w-full sm:w-[360px] z-20 bg-[var(--bg-0)]/97 backdrop-blur-xl border-l border-[var(--border)] shadow-2xl transition-transform duration-200 ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="sticky top-0 bg-[var(--bg-0)] border-b border-[var(--border)] px-3 py-3 flex items-center gap-2">
          <LayersIcon size={14} className="text-[var(--accent)]"/>
          <span className="text-sm font-semibold text-[var(--text)] flex-1">Layers</span>
          <button onClick={() => setDrawerOpen(false)} className="text-[var(--muted)] hover:text-[var(--text)] p-1"><X size={16}/></button>
        </div>

        <div className="px-3 py-2 border-b border-[var(--border)] flex items-center gap-2">
          <Search size={12} className="text-[var(--muted)] flex-shrink-0"/>
          <input
            type="text"
            placeholder="Search 30+ NASA layers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-[var(--text)] outline-none w-full"
          />
          {search && <button onClick={() => setSearch("")} className="text-[var(--muted)]"><X size={11}/></button>}
        </div>

        <div className="overflow-y-auto" style={{ height: "calc(100% - 110px)" }}>
          {LAYER_GROUPS.map((group) => {
            const groupLayers = filteredLayers.filter((l) => l.group === group);
            if (groupLayers.length === 0) return null;
            return (
              <div key={group} className="border-b border-[var(--border)] last:border-0">
                <div className="text-[9px] uppercase tracking-[0.25em] text-[var(--gold)] px-3 pt-3 pb-1.5">{group}</div>
                {groupLayers.map((l) => {
                  const isBase = baseId === l.id;
                  const isOverlay = overlayIds.includes(l.id);
                  return (
                    <div key={l.id} className={`px-3 py-2 text-xs border-l-2 ${isBase ? "border-l-[var(--accent)] bg-[var(--bg-1)]/50" : "border-l-transparent hover:bg-[var(--bg-1)]/30"}`}>
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => { setBaseId(l.id); setDrawerOpen(false); }}
                          className="flex-1 text-left"
                        >
                          <div className={`font-medium leading-tight ${isBase ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>{l.name}</div>
                          <div className="text-[10px] text-[var(--muted)] mt-0.5 leading-snug line-clamp-2">{l.blurb}</div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOverlayIds((ids) => isOverlay ? ids.filter((x) => x !== l.id) : [...ids, l.id]); }}
                          className={`flex-shrink-0 p-1.5 rounded ${isOverlay ? "text-[var(--accent-glow)] bg-[var(--bg-1)]" : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-1)]"}`}
                          title={isOverlay ? "Hide overlay" : "Add as overlay"}
                        >
                          {isOverlay ? <Eye size={12}/> : <EyeOff size={12}/>}
                        </button>
                      </div>
                      {isOverlay && !isBase && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[9px] uppercase tracking-wider text-[var(--muted)] w-12">opacity</span>
                          <input
                            type="range" min={0} max={100} value={(overlayOpacity[l.id] ?? 1) * 100}
                            onChange={(e) => setOverlayOpacity((o) => ({ ...o, [l.id]: parseFloat(e.target.value) / 100 }))}
                            className="flex-1 accent-[var(--accent-glow)] h-1"
                          />
                          <span className="text-[10px] font-mono text-[var(--muted)] w-8 text-right">{Math.round((overlayOpacity[l.id] ?? 1) * 100)}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* AOI quick-jump (footer of drawer when no search) */}
      {drawerOpen && !search && (
        <div className="absolute right-0 bottom-0 w-full sm:w-[360px] z-20 bg-[var(--bg-0)] border-t border-[var(--border)] px-3 py-2 max-h-[35vh] overflow-y-auto">
          <div className="text-[9px] uppercase tracking-[0.25em] text-[var(--gold)] mb-2 flex items-center gap-1"><MapPin size={10}/> Jump to UAP incident</div>
          <div className="grid grid-cols-2 gap-1">
            {INCIDENT_AOIS.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  mapRef.current?.getView().animate({ center: [a.lng, a.lat], zoom: 6, duration: 600 });
                  setPopupAoi(a);
                  popupOverlayRef.current?.setPosition([a.lng, a.lat]);
                  setDrawerOpen(false);
                }}
                className="text-xs text-[var(--text)] hover:text-[var(--accent-glow)] text-left px-2 py-1 rounded hover:bg-[var(--bg-1)] truncate"
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
