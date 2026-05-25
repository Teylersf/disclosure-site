import { ImageResponse } from "next/og";
import { getManifest } from "@/lib/manifest";
import { FINDINGS } from "@/lib/findings";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Disclosure — the PURSUE 2026 UAP archive";

export default async function Image() {
  const m = getManifest();
  const r1 = m.byRelease["5/8/26"];
  const r2 = m.byRelease["5/22/26"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(800px 400px at 20% 0%, rgba(94, 234, 212, 0.18), transparent 70%), radial-gradient(600px 300px at 80% 100%, rgba(255, 209, 102, 0.15), transparent 70%), #050610",
          color: "#e6ebf7",
          padding: 64,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top group */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: 5, background: "#5eead4" }} />
            <div style={{ display: "flex", fontSize: 14, letterSpacing: 8, color: "#5eead4", textTransform: "uppercase" }}>
              Disclosure · PURSUE 2026
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 76, fontWeight: 800, lineHeight: 1.05, color: "#e6ebf7" }}>
            The full PURSUE archive,
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              background: "linear-gradient(120deg, #5eead4, #6fa8dc, #ffd166)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            searchable, viewable, playable.
          </div>
        </div>

        {/* Bottom group */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 40 }}>
            <Stat n={m.totalCount} l="records" c="#5eead4" />
            <Stat n={m.byType.PDF} l="documents" c="#c1121f" />
            <Stat n={m.byType.VID} l="videos" c="#2a9d8f" />
            <Stat n={m.byType.AUD} l="audio" c="#9b59b6" />
            <Stat n={m.byType.IMG} l="images" c="#f4a261" />
            <Stat n={FINDINGS.length} l="findings" c="#ffd166" />
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 18, color: "#8c95b5" }}>
            {`Mirror of the U.S. Department of War 2026 UAP release · ${r1} from 5/8 · ${r2} from 5/22`}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

function Stat({ n, l, c }: { n: number; l: string; c: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", fontSize: 52, fontWeight: 800, color: c, lineHeight: 1 }}>{String(n)}</div>
      <div style={{ display: "flex", fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: "#8c95b5", marginTop: 4 }}>{l}</div>
    </div>
  );
}
