/**
 * GridRenderer — Advanced CAD-style viewport-aware background grid.
 *
 * Features beyond a basic grid:
 *   - Three density levels: sub-minor / minor / major
 *   - Origin crosshair (world 0,0) — always visible when in viewport
 *   - Coordinate labels on major lines — fade in above a zoom threshold
 *   - Smooth opacity-based density transitions — no jarring step jumps
 *   - Axis highlight lines (X=0, Y=0) distinct from regular grid
 *
 * Rendering strategy:
 *   All drawing happens in world space (the Konva stage transform is
 *   already applied to the canvas context in sceneFunc). World bounds
 *   are derived from viewport store values:
 *
 *     worldMin = (0 - stagePos) / scale
 *     worldMax = (screenSize - stagePos) / scale
 *
 * Level system:
 *   BASE_STEP      — e.g. 10 world units, the finest grid cell
 *   MINOR_EVERY    — every N base cells = 1 minor line  (e.g. 5)
 *   MAJOR_EVERY    — every M minor cells = 1 major line (e.g. 10)
 *
 *   At low zoom, base cells collapse below MIN_SCREEN_PX → step doubles.
 *   Opacity of each level is a smooth function of its screen pixel pitch,
 *   so transitions are gradual instead of binary on/off.
 *
 * Origin crosshair:
 *   Drawn as two full-viewport lines through world (0,0) with a distinct
 *   color, always on top of the grid. A small circle marks the exact origin.
 */

import { Shape } from "react-konva";
import { useEditorStore } from "@/store/editor.store";
import { useViewportStore } from "@/store/viewport.store";
import { useStageSize } from "./useStageSize";

// ─── Appearance ───────────────────────────────────────────────────────────────

const SUB_MINOR_COLOR = "rgba(148, 163, 184, 0.12)";
const MINOR_COLOR = "rgba(148, 163, 184, 0.28)";
const MAJOR_COLOR = "rgba(148, 163, 184, 0.55)";

const AXIS_X_COLOR = "rgba(239, 68,  68,  0.65)"; // red — X axis (horizontal, Y=0)
const AXIS_Y_COLOR = "rgba(59,  130, 246, 0.65)"; // blue — Y axis (vertical, X=0)
const ORIGIN_DOT_COLOR = "rgba(255, 255, 255, 0.9)";
const ORIGIN_RING_COLOR = "rgba(148, 163, 184, 0.6)";

const LABEL_COLOR = "rgba(148, 163, 184, 0.70)";
const LABEL_FONT = "10px ui-monospace, 'JetBrains Mono', 'Fira Code', monospace";
const LABEL_PADDING_PX = 3; // screen-space gap between grid line and label text
const LABEL_FADE_IN_SCALE = 0.4; // zoom level at which labels start appearing
const LABEL_FULL_OPACITY_SCALE = 0.8; // zoom level at which labels are fully opaque

// ─── Grid geometry ────────────────────────────────────────────────────────────

const BASE_STEP = 10; // world units per base cell (matches snap grid default)
const MINOR_EVERY = 5; // base cells per minor cell
const MAJOR_EVERY = 10; // minor cells per major cell

const MIN_SCREEN_PX = 6; // minimum screen pixels between any visible lines
const SUB_FADE_START = 8; // screen px pitch — sub-minor starts fading in
const SUB_FADE_END = 16; // screen px pitch — sub-minor fully opaque
const MINOR_FADE_START = 6;
const MINOR_FADE_END = 14;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map a value in [lo, hi] → [0, 1], clamped. */
function smoothFade(value: number, lo: number, hi: number): number {
  if (value <= lo) return 0;
  if (value >= hi) return 1;
  const t = (value - lo) / (hi - lo);
  // Smooth-step (cubic ease)
  return t * t * (3 - 2 * t);
}

/** Blend a CSS rgba string's alpha by a multiplier. */
function withAlpha(rgba: string, multiplier: number): string {
  // Fast path: parse "rgba(r, g, b, a)" and scale a
  const m = rgba.match(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/);
  if (!m) return rgba;
  const a = parseFloat(m[4]) * multiplier;
  return `rgba(${m[1]},${m[2]},${m[3]},${a.toFixed(3)})`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const GridRenderer = () => {
  const snapGrid = useEditorStore((s) => s.snapGrid);
  const { x: stageX, y: stageY, scale } = useViewportStore();
  const { width, height } = useStageSize();

  return (
    <Shape
      listening={false}
      sceneFunc={(ctx) => {
        // ── Visible world bounds ──────────────────────────────────────────────
        const worldMinX = (0 - stageX) / scale;
        const worldMinY = (0 - stageY) / scale;
        const worldMaxX = (width - stageX) / scale;
        const worldMaxY = (height - stageY) / scale;

        // ── Adaptive base step ────────────────────────────────────────────────
        // Start from snapGrid, then double until base cells are ≥ MIN_SCREEN_PX apart.
        let baseStep = snapGrid > 0 ? snapGrid : BASE_STEP;
        while (baseStep * scale < MIN_SCREEN_PX) baseStep *= 2;

        const minorStep = baseStep * MINOR_EVERY;
        const majorStep = minorStep * MAJOR_EVERY;

        // ── Screen-pixel pitches for opacity decisions ────────────────────────
        const subPitch = baseStep * scale; // screen px between sub-minor lines
        const minorPitch = minorStep * scale; // screen px between minor lines

        const subOpacity = smoothFade(subPitch, SUB_FADE_START, SUB_FADE_END);
        const minorOpacity = smoothFade(minorPitch, MINOR_FADE_START, MINOR_FADE_END);

        // ── Label opacity ─────────────────────────────────────────────────────
        const labelOpacity = smoothFade(scale, LABEL_FADE_IN_SCALE, LABEL_FULL_OPACITY_SCALE);

        ctx.save();

        // ── Draw grid lines ───────────────────────────────────────────────────
        const drawLines = (step: number, color: string, lineWidth: number, opacity: number, skipIfOnAxis = false) => {
          if (opacity <= 0.01) return;

          ctx.strokeStyle = withAlpha(color, opacity);
          ctx.lineWidth = lineWidth / scale;

          // Vertical lines (constant X)
          const startX = Math.floor(worldMinX / step) * step;
          for (let wx = startX; wx <= worldMaxX; wx += step) {
            if (skipIfOnAxis && Math.abs(wx) < step * 0.01) continue;
            ctx.beginPath();
            ctx.moveTo(wx, worldMinY);
            ctx.lineTo(wx, worldMaxY);
            ctx.stroke();
          }

          // Horizontal lines (constant Y)
          const startY = Math.floor(worldMinY / step) * step;
          for (let wy = startY; wy <= worldMaxY; wy += step) {
            if (skipIfOnAxis && Math.abs(wy) < step * 0.01) continue;
            ctx.beginPath();
            ctx.moveTo(worldMinX, wy);
            ctx.lineTo(worldMaxX, wy);
            ctx.stroke();
          }
        };

        // Draw from coarsest to finest so major lines paint over minor
        drawLines(majorStep, MAJOR_COLOR, 1.0, 1.0, true);
        drawLines(minorStep, MINOR_COLOR, 0.5, minorOpacity, true);
        drawLines(baseStep, SUB_MINOR_COLOR, 0.5, subOpacity, true);

        // ── Coordinate labels on major lines ─────────────────────────────────
        if (labelOpacity > 0.01) {
          // Labels are drawn in SCREEN space to keep consistent font size.
          // We temporarily undo the transform, draw, then restore.
          ctx.save();
          // ctx.resetTransform?.();
          ctx.setTransform(1,0,0,1,0,0)

          // Fallback for environments without resetTransform (older browsers)
          // In that case we scale and translate manually below.
          ctx.font = LABEL_FONT;
          ctx.fillStyle = withAlpha(LABEL_COLOR, labelOpacity);
          ctx.textBaseline = "top";

          const toScreen = (wx: number, wy: number) => ({
            sx: wx * scale + stageX,
            sy: wy * scale + stageY,
          });

          const startXMajor = Math.floor(worldMinX / majorStep) * majorStep;
          const startYMajor = Math.floor(worldMinY / majorStep) * majorStep;

          // Labels along the bottom edge of the viewport (X axis labels)
          const labelY = Math.max(toScreen(0, worldMinY).sy, 4) + LABEL_PADDING_PX;

          for (let wx = startXMajor; wx <= worldMaxX; wx += majorStep) {
            if (Math.abs(wx) < majorStep * 0.01) continue; // skip origin
            const { sx } = toScreen(wx, 0);
            const text = formatCoord(wx);
            ctx.fillText(text, sx + LABEL_PADDING_PX, labelY);
          }

          // Labels along the left edge of the viewport (Y axis labels)
          const labelX = Math.max(toScreen(worldMinX, 0).sx, 4) + LABEL_PADDING_PX;

          for (let wy = startYMajor; wy <= worldMaxY; wy += majorStep) {
            if (Math.abs(wy) < majorStep * 0.01) continue; // skip origin
            const { sy } = toScreen(0, wy);
            const text = formatCoord(wy);
            ctx.fillText(text, labelX, sy + LABEL_PADDING_PX);
          }

          ctx.restore();
        }

        // ── Axis lines (X=0, Y=0) ─────────────────────────────────────────────
        // Always draw these on top of the grid, full viewport width/height.
        // Y=0 line (horizontal) — colored red (X axis)
        if (worldMinY <= 0 && worldMaxY >= 0) {
          ctx.beginPath();
          ctx.strokeStyle = AXIS_X_COLOR;
          ctx.lineWidth = 1.5 / scale;
          ctx.moveTo(worldMinX, 0);
          ctx.lineTo(worldMaxX, 0);
          ctx.stroke();
        }

        // X=0 line (vertical) — colored blue (Y axis)
        if (worldMinX <= 0 && worldMaxX >= 0) {
          ctx.beginPath();
          ctx.strokeStyle = AXIS_Y_COLOR;
          ctx.lineWidth = 1.5 / scale;
          ctx.moveTo(0, worldMinY);
          ctx.lineTo(0, worldMaxY);
          ctx.stroke();
        }

        // ── Origin crosshair dot ──────────────────────────────────────────────
        const originInView = worldMinX <= 0 && worldMaxX >= 0 && worldMinY <= 0 && worldMaxY >= 0;

        if (originInView) {
          const dotR = 4 / scale;
          const ringR = 7 / scale;

          // Outer ring
          ctx.beginPath();
          ctx.arc(0, 0, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = ORIGIN_RING_COLOR;
          ctx.lineWidth = 1 / scale;
          ctx.stroke();

          // Inner filled dot
          ctx.beginPath();
          ctx.arc(0, 0, dotR, 0, Math.PI * 2);
          ctx.fillStyle = ORIGIN_DOT_COLOR;
          ctx.fill();

          // Tick marks along axes at the origin
          const tickLen = 5 / scale;
          ctx.strokeStyle = ORIGIN_RING_COLOR;
          ctx.lineWidth = 1 / scale;

          ctx.beginPath();
          ctx.moveTo(-tickLen, 0);
          ctx.lineTo(tickLen, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, -tickLen);
          ctx.lineTo(0, tickLen);
          ctx.stroke();
        }

        ctx.restore();
      }}
    />
  );
};

// ── Coord formatting ──────────────────────────────────────────────────────────

/**
 * Format a world coordinate for display as a grid label.
 * - Integers shown without decimal (100, -50)
 * - Non-integers shown with minimal precision (12.5)
 */
function formatCoord(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded === Math.round(rounded) ? String(Math.round(rounded)) : rounded.toFixed(1);
}

export default GridRenderer;
