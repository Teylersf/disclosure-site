import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Tv, Search, Archive, Home, AlertTriangle, Rocket, Clock, Cpu } from "lucide-react";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_KEYWORDS, SITE_TWITTER } from "@/lib/site";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: "%s — Disclosure",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Disclosure",
  keywords: SITE_KEYWORDS,
  authors: [{ name: "Disclosure", url: SITE_URL }],
  creator: "Disclosure",
  publisher: "Disclosure",
  category: "news",
  classification: "Government documents archive",
  referrer: "origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/feed.xml" },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    // Image auto-supplied by app/opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    site: SITE_TWITTER,
    creator: SITE_TWITTER,
    // Image auto-supplied by app/opengraph-image.tsx
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: { icon: "/favicon.ico" },
};

// Next 16 doesn't auto-inject <meta name="viewport"> — declare it explicitly so
// mobile browsers render at device-width (not the default ~980px desktop fallback).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050610",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Disclosure",
  url: SITE_URL,
  description: "Independent searchable mirror of the U.S. Department of War PURSUE program UAP file release.",
  sameAs: ["https://www.war.gov/UFO/"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      {/*
        Layout shell:
        - mobile: min-h-dvh body, natural document scroll (URL bar collapses normally).
        - desktop: h-dvh body with internal main scrolling, so header + footer stay in
          place and TV mode can fill `main` exactly with h-full.
      */}
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className="min-h-dvh md:h-dvh flex flex-col grain">
        <header className="relative z-10 border-b border-[var(--border)] bg-[var(--bg-0)]/80 backdrop-blur">
          <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3 sm:gap-6">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 text-[var(--text)] min-w-0">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-glow)] shadow-[0_0_12px_rgba(94,234,212,0.8)] flex-shrink-0" />
              <span className="text-sm sm:text-base font-semibold tracking-[0.15em] sm:tracking-[0.18em] uppercase">Disclosure</span>
              <span className="text-xs text-[var(--muted)] tracking-widest hidden md:inline">PURSUE 2026</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm" aria-label="Main navigation">
              <Link href="/" className="btn px-2 sm:px-3" title="Home"><Home size={14}/> <span className="hidden lg:inline">Home</span></Link>
              <Link href="/search" className="btn px-2 sm:px-3" title="Search"><Search size={14}/> <span className="hidden lg:inline">Search</span></Link>
              <Link href="/findings" className="btn px-2 sm:px-3" style={{ borderColor: "var(--gold)", color: "var(--gold)" }} title="Findings"><AlertTriangle size={14}/> <span className="hidden lg:inline">Findings</span></Link>
              <Link href="/missions" className="btn px-2 sm:px-3" title="NASA Missions Archive"><Rocket size={14}/> <span className="hidden lg:inline">Missions</span></Link>
              <Link href="/analyze" className="btn px-2 sm:px-3" title="Video Analysis Lab"><Cpu size={14}/> <span className="hidden lg:inline">Analyze</span></Link>
              <Link href="/timeline" className="btn px-2 sm:px-3" title="File version timeline"><Clock size={14}/> <span className="hidden lg:inline">Timeline</span></Link>
              <Link href="/bundles" className="btn px-2 sm:px-3" title="Bundles"><Archive size={14}/> <span className="hidden lg:inline">Bundles</span></Link>
              <Link href="/tv" className="btn btn-gold px-2 sm:px-3" title="TV Mode"><Tv size={14}/> <span className="hidden sm:inline">TV{" "}</span><span className="hidden lg:inline">Mode</span></Link>
            </nav>
          </div>
        </header>
        <main className="relative z-10 flex-1 md:min-h-0 md:overflow-y-auto">{children}</main>
        <footer className="relative z-10 border-t border-[var(--border)] mt-16 py-8 text-center text-xs text-[var(--muted)]">
          <p>
            U.S. Department of War — Presidential Unsealing and Reporting System for UAP Encounters
            <span className="mx-2">·</span>
            Source: <a href="https://www.war.gov/UFO/" target="_blank" rel="noreferrer">war.gov/UFO/</a>
            <span className="mx-2">·</span>
            Independent mirror — not affiliated with the U.S. government
          </p>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
