/**
 * TouchLoupe — a finger-tracking magnifier for precise touch drawing / editing.
 *
 * On touch the fingertip hides the exact point being drawn or grabbed, so placing
 * a wall endpoint or snapping to a node is guesswork. This lens magnifies the
 * canvas area under the finger into a circle floating just above it, with a centre
 * crosshair marking the touch point — the snap dot, ghost endpoint and grid all
 * read clearly.
 *
 * It blits the ALREADY-rendered scene-layer pixels (a cheap GPU copy via
 * drawImage — no scene re-render), so it adds no per-frame geometry cost. The
 * Canvas only mounts it during an active precision gesture (a drawing stroke or a
 * select-mode transform) — never idle, never while panning / pinching — so it
 * stays "smart" and unobtrusive. Mobile only (`md:hidden`).
 */

import { useLayoutEffect, useRef, type RefObject } from "react";
import type Konva from "konva";

const D = 116; // lens diameter (CSS px)
const MAG = 2; // magnification factor
const GAP = 28; // gap between fingertip and lens
const MARGIN = 8; // keep the lens inside the viewport

const TouchLoupe = ({ x, y, stageRef }: { x: number; y: number; stageRef: RefObject<Konva.Stage> }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Position + blit before paint so the lens never flashes at a stale spot. Reads
  // the live scene canvas (may lag one frame behind Konva's batchDraw — fine).
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const lens = canvasRef.current;
    const stage = stageRef.current;
    if (!wrap || !lens || !stage) return;

    // Float above the fingertip; flip below when near the top edge; clamp in view.
    const top = y - GAP - D >= MARGIN ? y - GAP - D : y + GAP;
    const left = Math.max(MARGIN, Math.min(x - D / 2, window.innerWidth - D - MARGIN));
    wrap.style.left = `${left}px`;
    wrap.style.top = `${top}px`;

    const layer = stage.getLayers()[0];
    const ctx = lens.getContext("2d");
    if (!layer || !ctx) return;

    // Crisp lens: back the canvas at device resolution (set here, not in render,
    // so no impure window read happens during render).
    const dpr = window.devicePixelRatio || 1;
    if (lens.width !== D * dpr) {
      lens.width = D * dpr;
      lens.height = D * dpr;
    }

    const src = layer.getNativeCanvasElement();
    const rect = src.getBoundingClientRect();
    if (rect.width === 0) return;
    const pr = src.width / rect.width; // device px per CSS px on the source canvas
    const k = lens.width / D; // device px per CSS px on the lens (= dpr)

    const cx = x - rect.left; // touch point in source CSS px
    const cy = y - rect.top;
    const halfCss = D / MAG / 2; // half of the sampled region (CSS px)

    ctx.clearRect(0, 0, lens.width, lens.height);
    ctx.drawImage(
      src,
      (cx - halfCss) * pr,
      (cy - halfCss) * pr,
      (D / MAG) * pr,
      (D / MAG) * pr,
      0,
      0,
      lens.width,
      lens.height,
    );

    // Centre crosshair — the exact point under the fingertip.
    const mid = lens.width / 2;
    const arm = 9 * k;
    ctx.strokeStyle = "rgba(37,99,235,0.9)"; // blue-600
    ctx.lineWidth = k;
    ctx.beginPath();
    ctx.moveTo(mid, mid - arm);
    ctx.lineTo(mid, mid + arm);
    ctx.moveTo(mid - arm, mid);
    ctx.lineTo(mid + arm, mid);
    ctx.stroke();
  }, [x, y, stageRef]);

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none fixed z-50 overflow-hidden rounded-full border-2 border-brand bg-popover shadow-2xl md:hidden"
      style={{ left: -9999, top: -9999, width: D, height: D }}
    >
      <canvas ref={canvasRef} style={{ width: D, height: D }} />
    </div>
  );
};

export default TouchLoupe;
