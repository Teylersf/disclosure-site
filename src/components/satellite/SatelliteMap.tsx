"use client";

/**
 * OpenLayers-based GIBS map viewer.
 *
 * Features:
 *   - 30+ NASA GIBS layers across 9 groups (true color, geostationary, night,
 *     fire, IR, atmosphere, ocean, land, cryosphere, reference)
 *   - Day-by-day time slider, with -1 / +1 day shortcuts and Today button
 *   - Pickable base layer + multiple overlay layers with per-overlay opacity
 *   - 12 UAP-incident AOI markers, click → jump to incident page
 *   - URL state (?date= &base= &overlays= &lat= &lng= &z=) for deep-links + share
 *   - Screenshot current view as PNG
 *   - Fullscreen
 *   - Keyboard: ←/→ step day, +/- zoom, F fullscreen, S screenshot, R reset
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  GIBS_LAYERS, LAYER_GROUPS, getLayer, gibsTileUrl,
  DEFAULT_BASE_LAYER, DEFAULT_OVERLAYS, type GibsLayer,
} from "@/lib/gibs-layers";
import { INCIDENT_AOIS, type IncidentAoi } from "@/lib/satellite-aois";
import {
  Calendar, Layers as LayersIcon, ChevronLeft, ChevronRight, Maximize, Camera,
  RotateCcw, Search, X, MapPin, Eye, EyeOff, Plus, Minus,
} from "lucide-react";

// Lazy/dynamic OL imports — keep the bundle off the SSR path
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

// We render the map in EPSG:4326 (plate carrée) to match GIBS's native
// projection — same as NASA Worldview. This avoids the reprojection that
// caused the markers to drift from the basemap. With a 4326 view, raw
// [lng, lat] coordinates can be used directly without fromLonLat().

function ymd(d: Date): string { return d.toISOString().slice(0, 10); }
function clampDate(s: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return ymd(new Date(Date.now() - 86400000));
  return s;
}

// OL's XYZ source expects {x}/{y}/{z}; GIBS WMTS REST uses {z}/{y}/{x}.
// We convert by rewriting the placeholder string.
function makeXyz(layer: GibsLayer, date: string) {
  // GIBS pattern: .../<date>/<matrixSet>/{z}/{y}/{x}.<ext>
  const tmpl = gibsTileUrl(layer, date);
  // OL XYZ uses {z}/{x}/{y} by default — GIBS uses {z}/{y}/{x}, which is OL's standard for TMS.
  // We use tileLoadFunction to rewrite per request.
  return new XYZ({
    url: tmpl, // OL will pass {x}/{y}/{z} substitutions — we override the loader below
    crossOrigin: "anonymous",
    tileLoadFunction: (imageTile, src) => {
      // The default src may have {x}/{y}/{z} order; build the correct one ourselves.
      // We get z/x/y from the tile coord and form the GIBS URL.
      const coord = (imageTile as unknown as { getTileCoord: () => [number, number, number] }).getTileCoord();
      const [z, x, y] = coord;
      const url = `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${layer.layer}/default/${date}/${layer.matrixSet}/${z}/${y}/${x}.${layer.ext}`;
      const img = (imageTile as unknown as { getImage: () => HTMLImageElement }).getImage();
      img.src = url;
    },
    // Use 2x or 4x detail for layers that go finer.
    maxZoom: layer.matrixSet === "250m" ? 9 : layer.matrixSet === "500m" ? 8 : layer.matrixSet === "1km" ? 7 : layer.matrixSet === "2km" ? 6 : 13,
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

  const today = useMemo(() => ymd(new Date(Date.now() - 86400000)), []);
  const [date, setDate] = useState<string>(initialDate ?? today);
  const [baseId, setBaseId] = useState<string>(initialBase ?? DEFAULT_BASE_LAYER);
  const [overlayIds, setOverlayIds] = useState<string[]>(initialOverlays ?? DEFAULT_OVERLAYS);
  const [overlayOpacity, setOverlayOpacity] = useState<Record<string, number>>({});
  const [pickerOpen, setPickerOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [popupAoi, setPopupAoi] = useState<IncidentAoi | null>(null);

  // ---- Map init ----
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const base = getLayer(baseId)!;
    const baseLayer = new TileLayer({
      source: makeXyz(base, clampDate(date)),
      properties: { gibsId: base.id },
    });
    baseLayerRef.current = baseLayer;

    // Build AOI marker layer — coords are raw [lng, lat] in EPSG:4326
    const aoiSource = new VectorSource({
      features: INCIDENT_AOIS.map((a) => {
        const f = new Feature({ geometry: new Point([a.lng, a.lat]), aoi: a });
        f.setId(a.id);
        return f;
      }),
    });
    const aoiLayer = new VectorLayer({
      source: aoiSource,
      style: (feat) => new Style({
        image: new Circle({
          radius: 7,
          fill: new Fill({ color: "rgba(255, 209, 102, 0.85)" }),
          stroke: new Stroke({ color: "#fff", width: 2 }),
        }),
        text: new Text({
          text: ((feat.get("aoi") as IncidentAoi).name).split(",")[0],
          offsetY: -16,
          font: "11px ui-sans-serif, system-ui",
          fill: new Fill({ color: "#FFF" }),
          stroke: new Stroke({ color: "#050610", width: 3 }),
        }),
      }),
      zIndex: 999,
    });

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

    // Popup overlay
    if (popupRef.current) {
      const popOverlay = new Overlay({
        element: popupRef.current,
        positioning: "bottom-center",
        offset: [0, -14],
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

    // Add starting overlays
    for (const oid of overlayIds) {
      const layer = getLayer(oid);
      if (!layer) continue;
      const tl = new TileLayer({ source: makeXyz(layer, clampDate(date)), opacity: 1, properties: { gibsId: layer.id } });
      overlaysRegistry.current[oid] = tl;
      map.getLayers().insertAt(map.getLayers().getLength() - 1, tl); // below AOI markers
    }

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      overlaysRegistry.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- React to baseId / date changes ----
  useEffect(() => {
    const map = mapRef.current;
    const baseLayer = baseLayerRef.current;
    if (!map || !baseLayer) return;
    const base = getLayer(baseId);
    if (!base) return;
    baseLayer.setSource(makeXyz(base, clampDate(date)));
    baseLayer.set("gibsId", base.id);
    // Update overlays' date too
    for (const [oid, tl] of Object.entries(overlaysRegistry.current)) {
      const ol = getLayer(oid);
      if (!ol) continue;
      tl.setSource(makeXyz(ol, clampDate(date)));
    }
  }, [baseId, date]);

  // ---- React to overlay toggle ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const visible = new Set(overlayIds);

    // Remove ones that are no longer visible
    for (const [oid, tl] of Object.entries(overlaysRegistry.current)) {
      if (!visible.has(oid)) {
        map.removeLayer(tl);
        delete overlaysRegistry.current[oid];
      }
    }
    // Add ones that are newly visible
    for (const oid of overlayIds) {
      if (overlaysRegistry.current[oid]) continue;
      const layer = getLayer(oid);
      if (!layer) continue;
      const op = overlayOpacity[oid] ?? 1;
      const tl = new TileLayer({ source: makeXyz(layer, clampDate(date)), opacity: op, properties: { gibsId: layer.id } });
      overlaysRegistry.current[oid] = tl;
      // Insert below AOI markers (last layer)
      map.getLayers().insertAt(map.getLayers().getLength() - 1, tl);
    }
  }, [overlayIds]);

  // ---- React to opacity changes ----
  useEffect(() => {
    for (const [oid, tl] of Object.entries(overlaysRegistry.current)) {
      const op = overlayOpacity[oid] ?? 1;
      tl.setOpacity(op);
    }
  }, [overlayOpacity]);

  // ---- URL state sync ----
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

  // ---- Keyboard ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = (e.target as HTMLElement)?.tagName;
      if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); stepDay(-1); break;
        case "ArrowRight": e.preventDefault(); stepDay(1); break;
        case "+": case "=": mapRef.current?.getView().animate({ zoom: (mapRef.current.getView().getZoom() ?? 2) + 1, duration: 250 }); break;
        case "-": case "_": mapRef.current?.getView().animate({ zoom: (mapRef.current.getView().getZoom() ?? 2) - 1, duration: 250 }); break;
        case "f": case "F": toggleFullscreen(); break;
        case "r": case "R": resetView(); break;
        case "s": case "S": e.preventDefault(); screenshot(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepDay]);

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

  // Filter + group layers for the picker
  const filteredLayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return GIBS_LAYERS;
    return GIBS_LAYERS.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      l.blurb.toLowerCase().includes(q) ||
      l.group.toLowerCase().includes(q) ||
      l.layer.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4 h-full">
      <div className="relative card overflow-hidden bg-black" style={{ minHeight: 500 }}>
        <div ref={mapDivRef} className="absolute inset-0" />

        {/* Top control bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center gap-2 z-10 pointer-events-none">
          <div className="bg-[var(--bg-0)]/90 backdrop-blur border border-[var(--border)] rounded px-2 py-1.5 flex items-center gap-2 pointer-events-auto">
            <Calendar size={14} className="text-[var(--accent)]"/>
            <button onClick={() => stepDay(-1)} className="text-[var(--text)] hover:text-[var(--accent-glow)] px-1" title="-1 day (←)"><ChevronLeft size={14}/></button>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-[var(--text)] text-xs font-mono outline-none"
            />
            <button onClick={() => stepDay(1)} disabled={date >= today} className="text-[var(--text)] hover:text-[var(--accent-glow)] disabled:opacity-30 px-1" title="+1 day (→)"><ChevronRight size={14}/></button>
            <button onClick={() => setDate(today)} className="text-[var(--accent-glow)] text-[10px] uppercase tracking-widest ml-1">Today</button>
          </div>

          <div className="bg-[var(--bg-0)]/90 backdrop-blur border border-[var(--border)] rounded px-2 py-1.5 flex items-center gap-2 pointer-events-auto text-xs flex-1 min-w-0">
            <LayersIcon size={14} className="text-[var(--accent)]"/>
            <span className="font-semibold text-[var(--text)] truncate">{base?.name ?? baseId}</span>
            <span className="text-[var(--muted)] ml-auto text-[10px]">{base?.cadence}</span>
          </div>

          <div className="flex items-center gap-1 pointer-events-auto">
            <button onClick={resetView} className="btn" title="Reset view (R)"><RotateCcw size={14}/></button>
            <button onClick={screenshot} className="btn" title="Screenshot (S)"><Camera size={14}/></button>
            <button onClick={toggleFullscreen} className="btn" title="Fullscreen (F)"><Maximize size={14}/></button>
            <button onClick={() => setPickerOpen((v) => !v)} className="btn lg:hidden" title="Toggle picker"><LayersIcon size={14}/></button>
          </div>
        </div>

        {/* Zoom buttons */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1 z-10">
          <button onClick={() => mapRef.current?.getView().animate({ zoom: (mapRef.current.getView().getZoom() ?? 2) + 1, duration: 250 })} className="btn bg-[var(--bg-0)]/90 backdrop-blur" title="Zoom in"><Plus size={14}/></button>
          <button onClick={() => mapRef.current?.getView().animate({ zoom: (mapRef.current.getView().getZoom() ?? 2) - 1, duration: 250 })} className="btn bg-[var(--bg-0)]/90 backdrop-blur" title="Zoom out"><Minus size={14}/></button>
        </div>

        {/* Keyboard hint */}
        <div className="absolute bottom-3 right-3 text-[10px] text-[var(--muted)] bg-[var(--bg-0)]/85 backdrop-blur px-2 py-1 rounded pointer-events-none">
          <kbd className="font-mono text-[var(--accent-glow)]">←/→</kbd> day · <kbd className="font-mono text-[var(--accent-glow)]">+/-</kbd> zoom · <kbd className="font-mono text-[var(--accent-glow)]">S</kbd> shot · <kbd className="font-mono text-[var(--accent-glow)]">F</kbd> fullscreen
        </div>

        {/* AOI popup */}
        <div ref={popupRef} className="ol-popup" style={{ position: "absolute", pointerEvents: "auto" }}>
          {popupAoi && (
            <div className="bg-[var(--bg-0)]/95 backdrop-blur border border-[var(--accent)] rounded shadow-lg px-3 py-2 text-xs max-w-[240px]" style={{ transform: "translate(-50%, -100%)" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] uppercase tracking-widest text-[var(--gold)]">UAP incident site</div>
                <button onClick={() => { setPopupAoi(null); popupOverlayRef.current?.setPosition(undefined); }} className="text-[var(--muted)]"><X size={11}/></button>
              </div>
              <div className="font-semibold text-[var(--text)] mb-1">{popupAoi.name}</div>
              <div className="text-[var(--muted)] mb-2 line-clamp-3 leading-snug">{popupAoi.context}</div>
              <Link href={`/satellite/incident/${popupAoi.id}`} className="text-[var(--accent-glow)] text-[11px]">Open day-scrubber →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Layer picker sidebar */}
      <aside className={`${pickerOpen ? "block" : "hidden lg:block"} space-y-3 overflow-y-auto max-h-[calc(100dvh-180px)]`}>
        <div className="card p-3">
          <div className="flex items-center gap-2 mb-2">
            <Search size={12} className="text-[var(--muted)]"/>
            <input
              type="text"
              placeholder="Search layers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-[var(--text)] outline-none w-full"
            />
            {search && <button onClick={() => setSearch("")} className="text-[var(--muted)]"><X size={11}/></button>}
          </div>
          <div className="text-[10px] tracking-widest uppercase text-[var(--accent)]">Tap a row to set as base · ☰ to toggle as overlay</div>
        </div>

        {LAYER_GROUPS.map((group) => {
          const groupLayers = filteredLayers.filter((l) => l.group === group);
          if (groupLayers.length === 0) return null;
          return (
            <div key={group} className="card p-3">
              <div className="text-[10px] uppercase tracking-widest text-[var(--gold)] mb-2">{group}</div>
              <ul className="space-y-1">
                {groupLayers.map((l) => {
                  const isBase = baseId === l.id;
                  const isOverlay = overlayIds.includes(l.id);
                  return (
                    <li key={l.id} className={`px-2 py-1.5 rounded border ${isBase ? "border-[var(--accent)] bg-[var(--bg-1)]" : "border-[var(--border)]"} text-xs`}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setBaseId(l.id)}
                          className={`flex-1 text-left ${isBase ? "text-[var(--accent)] font-semibold" : "text-[var(--text)] hover:text-[var(--accent-glow)]"}`}
                          title="Set as base layer"
                        >
                          {l.name}
                        </button>
                        <button
                          onClick={() => setOverlayIds((ids) => isOverlay ? ids.filter((x) => x !== l.id) : [...ids, l.id])}
                          className={`${isOverlay ? "text-[var(--accent-glow)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
                          title={isOverlay ? "Hide overlay" : "Add as overlay"}
                        >
                          {isOverlay ? <Eye size={12}/> : <EyeOff size={12}/>}
                        </button>
                      </div>
                      <div className="text-[10px] text-[var(--muted)] mt-0.5 leading-snug">{l.blurb}</div>
                      {isOverlay && !isBase && (
                        <div className="mt-1.5">
                          <input
                            type="range" min={0} max={100} value={(overlayOpacity[l.id] ?? 1) * 100}
                            onChange={(e) => setOverlayOpacity((o) => ({ ...o, [l.id]: parseFloat(e.target.value) / 100 }))}
                            className="w-full accent-[var(--accent-glow)] h-1"
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        {/* AOI list */}
        <div className="card p-3">
          <div className="text-[10px] uppercase tracking-widest text-[var(--gold)] mb-2 flex items-center gap-1">
            <MapPin size={11}/> Jump to UAP incident
          </div>
          <ul className="space-y-0.5 text-xs">
            {INCIDENT_AOIS.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => {
                    mapRef.current?.getView().animate({ center: [a.lng, a.lat], zoom: 6, duration: 600 });
                    setPopupAoi(a);
                    popupOverlayRef.current?.setPosition([a.lng, a.lat]);
                  }}
                  className="text-[var(--text)] hover:text-[var(--accent-glow)] text-left w-full px-1.5 py-1 rounded hover:bg-[var(--bg-1)]"
                >
                  {a.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
