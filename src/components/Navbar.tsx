"use client";

/**
 * Top navigation: 6 sections, click-to-open dropdowns, mobile drawer.
 *
 *   Home  · Findings · Archive ▾ · Missions · Satellite ▾ · Social · Tools ▾
 *
 * On mobile (<md) the entire nav collapses behind a hamburger that opens a
 * full-height side drawer with the same items stacked and grouped.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, AlertTriangle, FolderArchive, Rocket, Satellite, AtSign, Wrench,
  Search, Clock, Archive as ArchiveIcon, Map as MapIcon, Camera, MapPin,
  Cpu, Tv, ChevronDown, Menu, X,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  sub?: string;
  highlight?: "gold";
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;            // if present, the top-level row IS a link (no dropdown)
  highlight?: "gold";
  items?: NavItem[];        // if present, opens a dropdown panel
}

const NAV: NavSection[] = [
  { id: "home", label: "Home", icon: <Home size={14}/>, href: "/" },
  { id: "findings", label: "Findings", icon: <AlertTriangle size={14}/>, href: "/findings", highlight: "gold" },
  {
    id: "archive", label: "Archive", icon: <FolderArchive size={14}/>,
    items: [
      { href: "/search",   label: "Search records",   icon: <Search size={14}/>,      sub: "Full-text + filters across the PURSUE archive" },
      { href: "/timeline", label: "File timeline",    icon: <Clock size={14}/>,       sub: "Every captured version of every file, never deleted" },
      { href: "/bundles",  label: "Download bundles", icon: <ArchiveIcon size={14}/>, sub: "ZIPs of the official release packages" },
    ],
  },
  { id: "missions", label: "Missions", icon: <Rocket size={14}/>, href: "/missions" },
  {
    id: "satellite", label: "Satellite", icon: <Satellite size={14}/>,
    items: [
      { href: "/satellite/live",  label: "Live frames (every 30 min)", icon: <Satellite size={14}/>, sub: "GOES + Himawari full-disc captures, time-lapse, scrub today's frames" },
      { href: "/satellite",       label: "Archive landing",            icon: <Satellite size={14}/>, sub: "Overview of every source we mirror" },
      { href: "/satellite/map",   label: "Interactive map",            icon: <MapIcon size={14}/>,   sub: "30+ NASA GIBS layers · time slider · share-by-URL" },
      { href: "/satellite/iotd",  label: "Image of the Day",           icon: <Camera size={14}/>,    sub: "NASA Earth Observatory IOTD mirror" },
    ],
  },
  { id: "social", label: "@WH", icon: <AtSign size={14}/>, href: "/whitehouse-uap" },
  {
    id: "tools", label: "Tools", icon: <Wrench size={14}/>,
    items: [
      { href: "/analyze", label: "Video Analysis Lab", icon: <Cpu size={14}/>, sub: "Frame-step, edges, histogram, zoom 16× · forensic-grade" },
      { href: "/tv",      label: "TV Mode",            icon: <Tv size={14}/>,  sub: "Auto-play every video back-to-back, full-screen" },
    ],
  },
];

function isPathActive(pathname: string, section: NavSection): boolean {
  if (section.href) return section.href === "/" ? pathname === "/" : pathname === section.href || pathname.startsWith(section.href + "/");
  return section.items?.some((it) => pathname === it.href || pathname.startsWith(it.href + "/")) ?? false;
}

export default function Navbar() {
  const pathname = usePathname();
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on route change
  useEffect(() => { setOpenId(null); setMobileOpen(false); }, [pathname]);

  // Click-outside to close dropdowns
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!navRef.current) return;
      if (!navRef.current.contains(e.target as Node)) setOpenId(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpenId(null); setMobileOpen(false); } };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousedown", onClick); window.removeEventListener("keydown", onKey); };
  }, []);

  const toggle = useCallback((id: string) => setOpenId((cur) => cur === id ? null : id), []);

  return (
    <div ref={navRef} className="relative flex items-center gap-1">
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1 text-sm" aria-label="Main navigation">
        {NAV.map((s) => {
          const active = isPathActive(pathname, s);
          const goldStyle = s.highlight === "gold" ? { borderColor: "var(--gold)", color: "var(--gold)" } : undefined;

          if (s.href) {
            return (
              <Link
                key={s.id}
                href={s.href}
                className={`btn px-2 lg:px-3 ${active ? "btn-primary" : ""}`}
                style={goldStyle}
                title={s.label}
              >
                {s.icon} <span className="hidden lg:inline">{s.label}</span>
              </Link>
            );
          }

          // Dropdown trigger
          return (
            <div key={s.id} className="relative">
              <button
                type="button"
                onClick={() => toggle(s.id)}
                className={`btn px-2 lg:px-3 ${openId === s.id || active ? "btn-primary" : ""}`}
                style={goldStyle}
                title={s.label}
                aria-haspopup="true"
                aria-expanded={openId === s.id}
              >
                {s.icon} <span className="hidden lg:inline">{s.label}</span>
                <ChevronDown size={11} className={`transition-transform ${openId === s.id ? "rotate-180" : ""}`}/>
              </button>
              {openId === s.id && s.items && (
                <div
                  className="absolute top-full left-0 mt-1 min-w-[280px] bg-[var(--bg-0)]/95 backdrop-blur border border-[var(--border)] rounded shadow-2xl z-50 py-1"
                  role="menu"
                >
                  {s.items.map((it) => {
                    const itActive = pathname === it.href || pathname.startsWith(it.href + "/");
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        className={`flex items-start gap-3 px-3 py-2 hover:bg-[var(--bg-1)] transition-colors ${itActive ? "text-[var(--accent)] bg-[var(--bg-1)]" : "text-[var(--text)]"}`}
                        role="menuitem"
                      >
                        <span className="mt-0.5 text-[var(--accent)] flex-shrink-0">{it.icon}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium leading-tight">{it.label}</span>
                          {it.sub && <span className="block text-[10px] text-[var(--muted)] leading-snug mt-0.5">{it.sub}</span>}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="btn md:hidden px-2"
        aria-label="Open menu"
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={16}/> : <Menu size={16}/>}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur z-40" onClick={() => setMobileOpen(false)}/>
          <div className="md:hidden fixed top-0 right-0 bottom-0 w-[88vw] max-w-[340px] bg-[var(--bg-0)] border-l border-[var(--border)] z-50 overflow-y-auto">
            <div className="sticky top-0 bg-[var(--bg-0)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
              <span className="text-xs tracking-[0.3em] uppercase text-[var(--accent)]">Disclosure</span>
              <button onClick={() => setMobileOpen(false)} className="btn px-1.5"><X size={16}/></button>
            </div>
            <nav className="py-2" aria-label="Mobile navigation">
              {NAV.map((s) => {
                if (s.href) {
                  const active = isPathActive(pathname, s);
                  return (
                    <Link
                      key={s.id}
                      href={s.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] ${active ? "bg-[var(--bg-1)] text-[var(--accent)]" : "text-[var(--text)]"}`}
                      style={s.highlight === "gold" ? { color: "var(--gold)" } : undefined}
                    >
                      <span className="text-[var(--accent)]">{s.icon}</span>
                      <span className="font-semibold">{s.label}</span>
                    </Link>
                  );
                }
                return (
                  <details key={s.id} className="border-b border-[var(--border)]" open={isPathActive(pathname, s)}>
                    <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer text-[var(--text)] [&::-webkit-details-marker]:hidden">
                      <span className="text-[var(--accent)]">{s.icon}</span>
                      <span className="font-semibold flex-1">{s.label}</span>
                      <ChevronDown size={14} className="text-[var(--muted)]"/>
                    </summary>
                    <div className="bg-[var(--bg-1)]/60">
                      {s.items?.map((it) => {
                        const itActive = pathname === it.href || pathname.startsWith(it.href + "/");
                        return (
                          <Link
                            key={it.href}
                            href={it.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-start gap-3 pl-10 pr-4 py-2.5 ${itActive ? "text-[var(--accent)] bg-[var(--bg-1)]" : "text-[var(--text)]"}`}
                          >
                            <span className="mt-0.5 text-[var(--muted)] flex-shrink-0">{it.icon}</span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm leading-tight">{it.label}</span>
                              {it.sub && <span className="block text-[10px] text-[var(--muted)] leading-snug mt-0.5">{it.sub}</span>}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
