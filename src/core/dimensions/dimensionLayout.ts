/**
 * dimensionLayout.ts — Layer 2 of the dimension system.
 *
 * Translates geometry + text into precise pixel metrics needed to:
 *   1. Correctly center the label on its anchor point.
 *   2. Build an Oriented Bounding Box (OBB) for collision detection.
 *
 * No React, no store, no side effects.
 *
 * --- Why not use canvas.measureText()? ---
 * Canvas measureText() is accurate but requires a CanvasRenderingContext2D
 * which is not available in pure-JS unit tests or server-side code.
 * The per-character width ratio for a given font/size is a stable constant
 * that we calibrate once here and validate in tests.
 *
 * Calibrated constants (verified against Chrome 124 canvas measureText):
 *   monospace 11px → char width = 6.60px  (ratio 0.600)
 *   Inter 11px     → char width = 5.94px  (ratio 0.540) [not used here]
 *
 * If font rendering ever drifts, update CHAR_WIDTH_RATIO.
 */

import type { DimensionGeometry } from "./dimensionGeometry";

// ---------------------------------------------------------------------------
// Font constants — calibrated for monospace 11px
// ---------------------------------------------------------------------------

/** Font size used for all dimension labels (px). */
export const LABEL_FONT_SIZE = 11;

/** Font family — must match what the Konva Text node uses. */
export const LABEL_FONT_FAMILY = "monospace";

/**
 * Ratio of character advance width to font-size for monospace fonts.
 * 0.600 is the canonical value for Courier-family fonts at any size.
 */
const CHAR_WIDTH_RATIO = 0.600;

/**
 * Line height multiplier for the font family.
 * Cap height is ~0.72 of font-size; we use line-height 1.2 for safe bbox.
 */
const LINE_HEIGHT_RATIO = 1.2;

/** Padding added around the label text inside the background pill, on each side. */
export const LABEL_PADDING = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Axis-aligned bounding box.
 * Used internally before rotation; the OBB is derived from this + angleDeg.
 */
export interface AABB {
  /** Half-width (from center) */
  hw: number;
  /** Half-height (from center) */
  hh: number;
}

/**
 * Oriented Bounding Box — the label's bounding rectangle in canvas space.
 * Stored as center + half-extents + rotation angle for efficient SAT tests.
 */
export interface OBB {
  /** Center in canvas space */
  cx: number;
  cy: number;
  /** Half-width along the OBB's local x-axis */
  hw: number;
  /** Half-height along the OBB's local y-axis */
  hh: number;
  /** Rotation of the OBB's x-axis from canvas x-axis, in degrees */
  angleDeg: number;
}

/**
 * Complete metrics for a single dimension label.
 * Carries everything the renderer and collision detector need.
 */
export interface LabelMetrics {
  /** Pixel width of the text string (character advance * count) */
  textWidth: number;
  /** Pixel height of the text (line-height * font-size) */
  textHeight: number;
  /** Total rendered width including padding on both sides */
  boxWidth: number;
  /** Total rendered height including padding on both sides */
  boxHeight: number;
  /** Font size used (px, in canvas space) — already includes any zoom scaling */
  fontSize: number;
  /** Padding used inside the pill (px, in canvas space) — zoom-scaled */
  padding: number;
  /**
   * X offset from anchor → Konva Text offsetX.
   * Centering: offsetX = boxWidth / 2 places the text center on the anchor.
   */
  offsetX: number;
  /**
   * Y offset from anchor → Konva Text offsetY.
   * Centering: offsetY = boxHeight / 2 places the text center on the anchor.
   */
  offsetY: number;
  /** The oriented bounding box for SAT collision detection */
  obb: OBB;
}

// ---------------------------------------------------------------------------
// Measurement
// ---------------------------------------------------------------------------

/**
 * Zoom compensation for dimension annotations.
 *
 * The whole dimension layer is drawn in canvas (world) pixels and scaled by the
 * stage zoom, so on zoom-out everything — including the labels — shrinks and the
 * numbers become unreadable. To keep annotations a constant on-screen size we
 * multiply every sizing constant (font, padding, offsets, gaps, ticks) by this
 * factor: world size × zoom then stays constant. We only compensate on zoom-OUT
 * (factor ≥ 1); when zoomed in the annotations scale with the drawing as usual.
 */
export const dimensionPxScale = (zoom: number): number => (zoom > 0 ? Math.max(1, 1 / zoom) : 1);

/**
 * Minimum on-screen length (px) a segment must have for its dimension to be worth
 * drawing. Below this the number can't be read or fitted between its witness
 * lines, so the annotation is culled — it reappears as the user zooms in and the
 * segment grows past the threshold. This is the level-of-detail rule that keeps
 * small / dense plans legible instead of a wall of overlapping labels. A
 * legibility-truth constant (like the collinear tolerance), not a user setting.
 */
export const MIN_DIM_SCREEN_PX = 48;

/**
 * Level-of-detail gate: is a segment of world length `lengthPx`, viewed at the
 * given stage `zoom`, long enough on screen to carry a readable dimension? Shared
 * by every dimension producer (per-segment, chains, arc) so the cull threshold is
 * defined once.
 */
export const isDimensionLegible = (lengthPx: number, zoom: number): boolean =>
  lengthPx * (zoom > 0 ? zoom : 1) >= MIN_DIM_SCREEN_PX;

/**
 * Measure a label string and produce all metrics needed for precise rendering
 * and collision detection.
 *
 * @param text       The formatted dimension string (e.g. "250cm")
 * @param anchor     Canvas-space center point of the label
 * @param angleDeg   Rotation of the label (follows dimension line)
 * @param pxScale    Zoom-compensation factor (see dimensionPxScale); 1 = none
 */
export const measureLabel = (
  text: string,
  anchor: { x: number; y: number },
  angleDeg: number,
  pxScale: number = 1,
): LabelMetrics => {
  const fontSize = LABEL_FONT_SIZE * pxScale;
  const padding = LABEL_PADDING * pxScale;
  const charWidth = fontSize * CHAR_WIDTH_RATIO;
  const textWidth = text.length * charWidth;
  const textHeight = fontSize * LINE_HEIGHT_RATIO;

  const boxWidth = textWidth + padding * 2;
  const boxHeight = textHeight + padding * 2;

  // Half-extents for centering
  const offsetX = boxWidth / 2;
  const offsetY = boxHeight / 2;

  const obb: OBB = {
    cx: anchor.x,
    cy: anchor.y,
    hw: offsetX,
    hh: offsetY,
    angleDeg,
  };

  return { textWidth, textHeight, boxWidth, boxHeight, fontSize, padding, offsetX, offsetY, obb };
};

// ---------------------------------------------------------------------------
// Convenience builder: geometry → metrics
// ---------------------------------------------------------------------------

/**
 * Measure the label for a computed DimensionGeometry at a given offset.
 * The anchor is taken from geom.labelAnchor (already in canvas space).
 */
export const metricsFromGeometry = (
  geom: DimensionGeometry,
  text: string,
  pxScale: number = 1,
): LabelMetrics =>
  measureLabel(text, geom.labelAnchor, geom.angleDeg, pxScale);
