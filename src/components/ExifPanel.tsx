"use client";

import { useEffect, useState } from "react";
import exifr from "exifr";

type Props = { src: string };

const SECTIONS: { label: string; keys: string[] }[] = [
  { label: "Capture", keys: ["Make", "Model", "LensModel", "Software", "DateTimeOriginal", "DateTime", "CreateDate", "ModifyDate"] },
  { label: "Exposure", keys: ["ExposureTime", "FNumber", "ISO", "ISOSpeedRatings", "ExposureProgram", "MeteringMode", "Flash", "FocalLength", "FocalLengthIn35mmFormat"] },
  { label: "Image", keys: ["ImageWidth", "ImageHeight", "ExifImageWidth", "ExifImageHeight", "Orientation", "ColorSpace", "BitsPerSample", "Compression"] },
  { label: "GPS", keys: ["latitude", "longitude", "GPSAltitude", "GPSDateStamp", "GPSTimeStamp"] },
  { label: "Other", keys: ["Artist", "Copyright", "ImageDescription", "UserComment", "XPComment", "Rating", "Keywords"] },
];

export default function ExifPanel({ src }: Props) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setData(null);
    (async () => {
      try {
        const exif = await exifr.parse(src, { gps: true, translateValues: true, reviveValues: true });
        if (cancelled) return;
        setData(exif ?? {});
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not read EXIF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [src]);

  if (loading) return <div className="text-xs text-[var(--muted)] py-4">Reading EXIF…</div>;
  if (err) return <div className="text-xs text-[var(--muted)] py-4">EXIF unavailable: {err}</div>;
  if (!data || Object.keys(data).length === 0) {
    return <div className="text-xs text-[var(--muted)] py-4">No EXIF metadata present in this image.</div>;
  }

  const renderRow = (k: string, v: unknown) => {
    let display: string;
    if (v instanceof Date) display = v.toISOString().replace("T", " ").slice(0, 19);
    else if (typeof v === "number") display = Number.isInteger(v) ? String(v) : v.toFixed(4);
    else if (typeof v === "object" && v !== null) display = JSON.stringify(v);
    else display = String(v);
    return (
      <div key={k} className="flex justify-between gap-3 py-1 border-b border-[var(--border)] last:border-0">
        <span className="text-[11px] text-[var(--muted)] font-mono">{k}</span>
        <span className="text-[12px] text-[var(--text)] font-mono text-right break-all">{display}</span>
      </div>
    );
  };

  const seen = new Set<string>();
  const sections = SECTIONS.map((sec) => {
    const rows = sec.keys.filter((k) => k in data).map((k) => {
      seen.add(k);
      return renderRow(k, data[k]);
    });
    return { label: sec.label, rows };
  });

  const other = Object.entries(data).filter(([k]) => !seen.has(k));

  const lat = data["latitude"];
  const lon = data["longitude"];
  const hasGps = typeof lat === "number" && typeof lon === "number";

  return (
    <div className="space-y-4">
      {hasGps && (
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=10/${lat}/${lon}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary"
        >
          View location on map: {(lat as number).toFixed(4)}, {(lon as number).toFixed(4)}
        </a>
      )}
      {sections.map((s) =>
        s.rows.length > 0 ? (
          <div key={s.label}>
            <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] mb-1">{s.label}</div>
            <div className="bg-[var(--bg-1)] rounded-md px-3 py-2 border border-[var(--border)]">{s.rows}</div>
          </div>
        ) : null,
      )}
      {other.length > 0 && (
        <details>
          <summary className="text-[10px] uppercase tracking-wider text-[var(--muted)] cursor-pointer">All raw fields ({other.length})</summary>
          <div className="bg-[var(--bg-1)] rounded-md px-3 py-2 border border-[var(--border)] mt-2">
            {other.map(([k, v]) => renderRow(k, v))}
          </div>
        </details>
      )}
    </div>
  );
}
