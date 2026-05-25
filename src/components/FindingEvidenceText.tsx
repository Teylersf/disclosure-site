/**
 * Lightweight renderer for the markdown-ish text in finding.evidence.
 * Supports **bold**, `code`, line breaks, • bullets, and absolute file paths.
 * No external markdown library — keeps the bundle small and the output controlled.
 */
import React from "react";

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Split on `code` first, preserving the delimiters
  const codeSplit = text.split(/(`[^`]+`)/g);
  let k = 0;
  for (const seg of codeSplit) {
    if (seg.startsWith("`") && seg.endsWith("`")) {
      parts.push(
        <code key={`${keyBase}-c-${k++}`} className="bg-[var(--bg-2)] text-[var(--accent-glow)] px-1.5 py-0.5 rounded text-[0.86em] font-mono">
          {seg.slice(1, -1)}
        </code>,
      );
      continue;
    }
    // Bold
    const boldSplit = seg.split(/(\*\*[^*]+\*\*)/g);
    for (const b of boldSplit) {
      if (b.startsWith("**") && b.endsWith("**")) {
        parts.push(<strong key={`${keyBase}-b-${k++}`} className="text-[var(--text)] font-semibold">{b.slice(2, -2)}</strong>);
      } else if (b) {
        parts.push(<React.Fragment key={`${keyBase}-t-${k++}`}>{b}</React.Fragment>);
      }
    }
  }
  return parts;
}

export default function FindingEvidenceText({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-[var(--muted)]">
      {paragraphs.map((p, i) => {
        const isBullets = p.split("\n").every((l) => l.trim().startsWith("•") || l.trim().startsWith("-") || !l.trim());
        if (isBullets) {
          const items = p.split("\n").filter((l) => l.trim()).map((l) => l.replace(/^[•\-]\s*/, ""));
          return (
            <ul key={i} className="space-y-1.5 pl-4">
              {items.map((it, j) => (
                <li key={j} className="list-disc list-outside marker:text-[var(--accent)]">
                  {renderInline(it, `${i}-${j}`)}
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{renderInline(p, String(i))}</p>;
      })}
    </div>
  );
}
