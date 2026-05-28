import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Heart, ExternalLink, Download, Archive as ArchiveIcon, AtSign } from "lucide-react";
import { getWhitehouseUap, type UapTweet } from "@/lib/whitehouse-uap";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "@WhiteHouse UAP teasers — every government social-media post about UFOs, archived",
  description:
    "Independent, never-delete mirror of every @WhiteHouse (and adjacent government account) social-media post about UAP/UFO disclosure. Original-quality video masters pulled directly from Twitter's CDN, byte-identical to source, with md5 receipts, Wayback Machine permalinks, and tweet metadata snapshots.",
  keywords: [
    "WhiteHouse UAP tweet archive",
    "WhiteHouse UFO twitter",
    "Trump UAP disclosure social media",
    "PURSUE UAP twitter posts",
    "government UFO social media archive",
  ],
  alternates: { canonical: "/whitehouse-uap" },
  openGraph: {
    type: "website",
    title: "@WhiteHouse UAP teasers — full archive",
    description: "Original-quality mirror of every @WhiteHouse UFO/UAP social-media post.",
    url: absoluteUrl("/whitehouse-uap"),
    siteName: SITE_NAME,
  },
};

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  const s = ms / 1000;
  return `${s.toFixed(2)}s`;
}

function formatPostedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

export default function WhitehouseUapPage() {
  const idx = getWhitehouseUap();

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-[var(--accent)] uppercase mb-2">
          <AtSign size={12}/> Social-media archive
        </div>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight gradient-text">
          @WhiteHouse UAP teasers
        </h1>
        <p className="text-[var(--muted)] mt-3 max-w-3xl text-sm md:text-base leading-relaxed">
          Every government social-media post about UFO/UAP disclosure, mirrored at source quality. Each video is
          pulled directly from Twitter&apos;s CDN — byte-identical to the original master variant, often higher
          quality than what plays in-feed. md5 receipts, Wayback Machine permalinks, and full tweet metadata
          snapshots are preserved alongside. Never-delete: superseded versions stay forever.
        </p>
        <div className="flex flex-wrap gap-3 mt-4 text-xs">
          <span className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg-1)]">
            <span className="text-[var(--muted)]">Tweets archived:</span> <span className="text-[var(--text)] font-semibold">{idx.totalTweets}</span>
          </span>
          <span className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg-1)]">
            <span className="text-[var(--muted)]">Accounts:</span> <span className="text-[var(--text)] font-semibold">{idx.accounts.join(", ")}</span>
          </span>
          <span className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg-1)]">
            <span className="text-[var(--muted)]">Last refresh:</span> <span className="text-[var(--text)] font-semibold">{new Date(idx.generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
          </span>
        </div>
      </header>

      <div className="grid gap-6">
        {idx.entries.map((tweet) => <TweetCard key={tweet.tweet_id} tweet={tweet} />)}
      </div>

      {idx.entries.length === 0 && (
        <div className="card p-12 text-center text-[var(--muted)]">
          No tweets archived yet.
        </div>
      )}
    </div>
  );
}

function TweetCard({ tweet }: { tweet: UapTweet }) {
  const videos = tweet.media.filter((m) => m.type === "video");
  return (
    <article className="card overflow-hidden">
      <div className="grid lg:grid-cols-[1fr_360px]">
        <div className="p-4 md:p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded bg-[var(--bg-1)] border border-[var(--border)] flex items-center justify-center text-xs font-bold">
              WH
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-semibold text-[var(--text)]">The White House</span>
                <span className="text-xs text-[var(--accent)]">✓ {tweet.account_verified_type ?? "Verified"}</span>
                <span className="text-xs text-[var(--muted)]">@{tweet.account}</span>
              </div>
              <div className="text-xs text-[var(--muted)] mt-0.5">{formatPostedAt(tweet.posted_at)}</div>
            </div>
            <Link href={tweet.tweet_url} target="_blank" rel="noreferrer" className="text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1 flex-shrink-0">
              Original <ExternalLink size={11}/>
            </Link>
          </div>

          <p className="text-base md:text-lg leading-relaxed text-[var(--text)] mb-4 break-words">
            {tweet.text}
          </p>

          {tweet.master_video_url && (
            <div className="rounded overflow-hidden border border-[var(--border)] bg-black mb-3">
              <video
                src={tweet.master_video_url}
                poster={tweet.poster_url ?? undefined}
                controls
                preload="metadata"
                className="w-full h-auto block"
                playsInline
              />
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)] mb-4">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle size={12}/> {tweet.engagement_at_capture.conversations.toLocaleString()}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Heart size={12}/> {tweet.engagement_at_capture.favorites.toLocaleString()}
            </span>
            <span className="text-[10px] text-[var(--muted)]">
              at archive time · {new Date(tweet.archived_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>

          {tweet.notes && tweet.notes.length > 0 && (
            <div className="text-xs text-[var(--muted)] space-y-1.5 border-t border-[var(--border)] pt-3">
              <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)] mb-1">Notes</div>
              {tweet.notes.map((n, i) => <p key={i} className="leading-relaxed">{n}</p>)}
            </div>
          )}
        </div>

        <aside className="bg-[var(--bg-1)]/40 border-t lg:border-t-0 lg:border-l border-[var(--border)] p-4 md:p-5 text-xs">
          <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted)] mb-2">Tweet ID</div>
          <div className="font-mono text-[var(--text)] mb-4 break-all">{tweet.tweet_id}</div>

          <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted)] mb-2">Video downloads</div>
          <ul className="space-y-1.5 mb-4">
            {videos.map((m) => (
              <li key={m.file}>
                <a
                  href={tweet.public_urls[m.file]}
                  download
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded border border-[var(--border)] hover:border-[var(--accent)] transition-colors group"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Download size={11} className="text-[var(--accent)]"/>
                    <span className="font-mono">{m.width}×{m.height}{m.is_master && <span className="text-[var(--gold)] ml-1">·master</span>}</span>
                  </span>
                  <span className="text-[var(--muted)]">{formatBytes(m.size_bytes)}</span>
                </a>
              </li>
            ))}
          </ul>

          {tweet.poster_url && (
            <>
              <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted)] mb-2">Poster</div>
              <a
                href={tweet.poster_url}
                download
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded border border-[var(--border)] hover:border-[var(--accent)] transition-colors mb-4"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Download size={11} className="text-[var(--accent)]"/> poster.jpg
                </span>
                <span className="text-[var(--muted)]">{formatBytes(tweet.media.find((m) => m.type === "poster")?.size_bytes ?? 0)}</span>
              </a>
            </>
          )}

          <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted)] mb-2">Duration</div>
          <div className="font-mono text-[var(--text)] mb-4">{formatDuration(tweet.duration_ms)}</div>

          <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted)] mb-2">md5 (master)</div>
          <div className="font-mono text-[var(--text)] mb-4 break-all">
            {tweet.media.find((m) => m.is_master)?.md5 ?? videos[0]?.md5 ?? "—"}
          </div>

          <div className="flex flex-col gap-2">
            <a href={tweet.wayback_url} target="_blank" rel="noreferrer" className="btn px-2 py-1.5 text-xs justify-center">
              <ArchiveIcon size={11}/> Wayback Machine
            </a>
            <a href={tweet.public_urls["tweet.json"] ?? `${tweet.bucket_prefix}/tweet.json`} target="_blank" rel="noreferrer" className="btn px-2 py-1.5 text-xs justify-center">
              tweet.json
            </a>
            <a href={tweet.public_urls["meta.json"] ?? `${tweet.bucket_prefix}/meta.json`} target="_blank" rel="noreferrer" className="btn px-2 py-1.5 text-xs justify-center">
              meta.json
            </a>
          </div>
        </aside>
      </div>
    </article>
  );
}
