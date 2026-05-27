"use client";

/**
 * RGB histogram rendered from the latest captured frame.
 * Renders a 256-bin histogram for each of R, G, B as overlapping area shapes.
 */
import { useEffect, useRef } from "react";

export default function Histogram({ frame }: { frame: ImageData | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const W = c.width;
    const H = c.height;
    ctx.clearRect(0, 0, W, H);

    if (!frame) {
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("no frame", W / 2, H / 2);
      return;
    }

    const r = new Uint32Array(256);
    const g = new Uint32Array(256);
    const b = new Uint32Array(256);
    const data = frame.data;
    // Sample every Nth pixel for performance
    const stride = Math.max(1, Math.floor(data.length / 4 / 50000));
    for (let i = 0; i < data.length; i += 4 * stride) {
      r[data[i]]++;
      g[data[i + 1]]++;
      b[data[i + 2]]++;
    }

    let max = 0;
    for (let i = 0; i < 256; i++) max = Math.max(max, r[i], g[i], b[i]);
    if (max === 0) return;

    const drawChannel = (arr: Uint32Array, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * W;
        const y = H - (arr[i] / max) * H;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    };

    ctx.globalCompositeOperation = "lighter";
    drawChannel(r, "rgba(220,60,60,0.55)");
    drawChannel(g, "rgba(60,220,80,0.45)");
    drawChannel(b, "rgba(80,140,255,0.55)");
    ctx.globalCompositeOperation = "source-over";

    // Axis ticks
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    ctx.fillText("0", 2, H - 2);
    ctx.textAlign = "right";
    ctx.fillText("255", W - 2, H - 2);
  }, [frame]);

  return <canvas ref={canvasRef} width={300} height={120} className="w-full h-30 rounded border border-[var(--border)] bg-black" />;
}
