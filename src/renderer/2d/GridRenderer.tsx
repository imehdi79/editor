/**
 * GridRenderer — viewport-aware CAD-style background grid.
 *
 *   - Three density levels: sub-minor / minor / major
 *   - Coordinate labels on major lines — fade in above a zoom threshold
 *   - Smooth opacity-based density transitions (no jarring step jumps)
 *
 * Rendering happens in world space (the Konva stage transform is already
 * applied to the canvas in sceneFunc). Visible world bounds come from the
 * viewport store:
 *
 *     worldMin = (0          - stagePos) / scale
 *     worldMax = (screenSize - stagePos) / scale
 *
 * Performance: every level's lines are batched into ONE path and stroked
 * once (a single `beginPath()`/`stroke()` per level) instead of stroking each
 * line individually — the sceneFunc re-runs on every pan/zoom frame, so this
 * turns hundreds of canvas stroke calls per frame into three.
 */

import { Shape } from "react-konva";
import { useEditorStore } from "@/store/editor.store";
import { useViewportStore } from "@/store/viewport.store";
import { useStageSize } from "./useStageSize";

// ─── Appearance ─────────────────────────────────────────────────────────────
// All grid/label ink shares one slate RGB; only the alpha differs per level,
// so we precompute the rgb prefix and just append alpha at draw time.
const GRID_RGB = "148, 163, 184";
const SUB_MINOR_ALPHA = 0.12;
const MINOR_ALPHA = 0.28;
const MAJOR_ALPHA = 0.55;
const LABEL_ALPHA = 0.7;

const rgba = (alpha: number) => `rgba(${GRID_RGB}, ${alpha.toFixed(3)})`;

const LABEL_FONT = "10px ui-monospace, 'JetBrains Mono', 'Fira Code', monospace";
const LABEL_PADDING_PX = 3; // screen-space gap between grid line and label
const LABEL_FADE_IN_SCALE = 0.4; // zoom at which labels start appearing
const LABEL_FULL_OPACITY_SCALE = 0.8; // zoom at which labels are fully opaque

// ─── Grid geometry ──────────────────────────────────────────────────────────

const BASE_STEP = 10; // world units per base cell (matches snap grid default)
const MINOR_EVERY = 5; // base cells per minor cell
const MAJOR_EVERY = 10; // minor cells per major cell

const MIN_SCREEN_PX = 6; // minimum screen pixels between any visible lines
const SUB_FADE_START = 8; // screen-px pitch where sub-minor starts fading in
const SUB_FADE_END = 16; // screen-px pitch where sub-minor is fully opaque
const MINOR_FADE_START = 6;
const MINOR_FADE_END = 14;

const MIN_VISIBLE_ALPHA = 0.004; // below this a level is invisible — skip it

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Smooth-step a value in [lo, hi] → [0, 1], clamped (cubic ease). */
function smoothFade(value: number, lo: number, hi: number): number {
  if (value <= lo) return 0;
  if (value >= hi) return 1;
  const t = (value - lo) / (hi - lo);
  return t * t * (3 - 2 * t);
}

/**
 * Format a world coordinate for a grid label: integers without a decimal
 * (100, -50), otherwise minimal precision (12.5).
 */
function formatCoord(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded === Math.round(rounded) ? String(Math.round(rounded)) : rounded.toFixed(1);
}

// ─── Component ──────────────────────────────────────────────────────────────

const GridRenderer = () => {
  const snapGrid = useEditorStore((s) => s.snapGrid);
  const stageX = useViewportStore((s) => s.x);
  const stageY = useViewportStore((s) => s.y);
  const scale = useViewportStore((s) => s.scale);
  const { width, height } = useStageSize();

  return (
    <Shape
      listening={false}
      sceneFunc={(ctx) => {
        // ── Visible world bounds ──────────────────────────────────────────
        const worldMinX = (0 - stageX) / scale;
        const worldMinY = (0 - stageY) / scale;
        const worldMaxX = (width - stageX) / scale;
        const worldMaxY = (height - stageY) / scale;

        // ── Adaptive base step ────────────────────────────────────────────
        // Start from snapGrid, double until base cells are ≥ MIN_SCREEN_PX apart.
        let baseStep = snapGrid > 0 ? snapGrid : BASE_STEP;
        while (baseStep * scale < MIN_SCREEN_PX) baseStep *= 2;

        const minorStep = baseStep * MINOR_EVERY;
        const majorStep = minorStep * MAJOR_EVERY;

        // ── Per-level alpha from screen-pixel pitch ───────────────────────
        const subAlpha = SUB_MINOR_ALPHA * smoothFade(baseStep * scale, SUB_FADE_START, SUB_FADE_END);
        const minorAlpha = MINOR_ALPHA * smoothFade(minorStep * scale, MINOR_FADE_START, MINOR_FADE_END);

        ctx.save();

        // Batch every line of one level into a single path → one stroke call.
        const drawLevel = (step: number, alpha: number, lineWidth: number) => {
          if (alpha <= MIN_VISIBLE_ALPHA) return;
          ctx.strokeStyle = rgba(alpha);
          ctx.lineWidth = lineWidth / scale;
          ctx.beginPath();
          for (let wx = Math.floor(worldMinX / step) * step; wx <= worldMaxX; wx += step) {
            ctx.moveTo(wx, worldMinY);
            ctx.lineTo(wx, worldMaxY);
          }
          for (let wy = Math.floor(worldMinY / step) * step; wy <= worldMaxY; wy += step) {
            ctx.moveTo(worldMinX, wy);
            ctx.lineTo(worldMaxX, wy);
          }
          ctx.stroke();
        };

        // Coarsest → finest so finer lines layer over coarser at shared cells.
        drawLevel(majorStep, MAJOR_ALPHA, 1.0);
        drawLevel(minorStep, minorAlpha, 0.5);
        drawLevel(baseStep, subAlpha, 0.5);

        // ── Coordinate labels on major lines ──────────────────────────────
        const labelAlpha = LABEL_ALPHA * smoothFade(scale, LABEL_FADE_IN_SCALE, LABEL_FULL_OPACITY_SCALE);
        if (labelAlpha > MIN_VISIBLE_ALPHA) {
          // Drawn in SCREEN space (identity transform) for a constant font size.
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.font = LABEL_FONT;
          ctx.fillStyle = rgba(labelAlpha);
          ctx.textBaseline = "top";

          // X labels run along the top edge; Y labels along the left edge.
          const labelY = Math.max(worldMinY * scale + stageY, 4) + LABEL_PADDING_PX;
          const labelX = Math.max(worldMinX * scale + stageX, 4) + LABEL_PADDING_PX;

          for (let wx = Math.floor(worldMinX / majorStep) * majorStep; wx <= worldMaxX; wx += majorStep) {
            if (Math.abs(wx) < majorStep * 0.01) continue; // skip origin
            ctx.fillText(formatCoord(wx), wx * scale + stageX + LABEL_PADDING_PX, labelY);
          }
          for (let wy = Math.floor(worldMinY / majorStep) * majorStep; wy <= worldMaxY; wy += majorStep) {
            if (Math.abs(wy) < majorStep * 0.01) continue; // skip origin
            ctx.fillText(formatCoord(wy), labelX, wy * scale + stageY + LABEL_PADDING_PX);
          }

          ctx.restore();
        }

        ctx.restore();
      }}
    />
  );
};

export default GridRenderer;
