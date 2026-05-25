import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Tv, Search, Archive, Home, AlertTriangle } from "lucide-react";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Disclosure — UAP Files (PURSUE 2026)",
  description:
    "Searchable archive of every record released by the U.S. Department of War PURSUE program: declassified UAP / UFO files, photographs, mission reports, sensor footage, and audio.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col grain">
        <header className="relative z-10 border-b border-[var(--border)] bg-[var(--bg-0)]/80 backdrop-blur">
          <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3 text-[var(--text)]">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-glow)] shadow-[0_0_12px_rgba(94,234,212,0.8)]" />
              <span className="text-base font-semibold tracking-[0.18em] uppercase">Disclosure</span>
              <span className="text-xs text-[var(--muted)] tracking-widest hidden sm:inline">PURSUE 2026</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/" className="btn"><Home size={14}/> Home</Link>
              <Link href="/search" className="btn"><Search size={14}/> Search</Link>
              <Link href="/findings" className="btn" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}><AlertTriangle size={14}/> Findings</Link>
              <Link href="/bundles" className="btn"><Archive size={14}/> Bundles</Link>
              <Link href="/tv" className="btn btn-gold"><Tv size={14}/> TV Mode</Link>
            </nav>
          </div>
        </header>
        <main className="relative z-10 flex-1">{children}</main>
        <footer className="relative z-10 border-t border-[var(--border)] mt-16 py-8 text-center text-xs text-[var(--muted)]">
          <p>
            U.S. Department of War — Presidential Unsealing and Reporting System for UAP Encounters
            <span className="mx-2">·</span>
            Source: <a href="https://www.war.gov/UFO/" target="_blank" rel="noreferrer">war.gov/UFO/</a>
            <span className="mx-2">·</span>
            Local archive — not affiliated with the U.S. government
          </p>
        </footer>
      </body>
    </html>
  );
}
