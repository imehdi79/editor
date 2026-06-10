/**
 * computeDimensions.ts — live-drag dimension label geometry.
 *
 * This is a SEPARATE concern from the committed-shape dimension system
 * (dimensionGeometry / dimensionLayout / dimensionCollision).
 *
 * The live drag indicator shows a single floating label while the user is
 * actively drawing a segment. It uses a simpler geometry (no extension lines,
 * no dimension line) because it only needs to display the current length
 * in a readable position near the cursor.
 *
 * The centering fix: all text metrics now use the correct per-character
 * pixel width (6.60px for monospace 11px) and line-height (13.2px), not
 * the previously incorrect empirical constants.
 */

import { LABEL_FONT_SIZE, LABEL_PADDING } from "./dimensionLayout";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Perpendicular offset of the live label from the segment being drawn. */
const LIVE_LABEL_OFFSET = 20;

/** Monospace character advance width at LABEL_FONT_SIZE. */
const CHAR_WIDTH = LABEL_FONT_SIZE * 0.6;

/** Line height at LABEL_FONT_SIZE. */
const LINE_HEIGHT = LABEL_FONT_SIZE * 1.2;

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

/**
 * All data the live DimensionRenderer needs to draw the floating label.
 *
 * Centering contract:
 *   The Konva Text node is positioned at (anchorX, anchorY).
 *   offsetX = half the total rendered box width → text is horizontally centered.
 *   offsetY = half the total rendered box height → text is vertically centered.
 *   rotation = angleDeg, applied around (anchorX, anchorY).
 *
 * This places the text center exactly on the anchor point and rotates it
 * around that center — the correct rotation-about-center pattern in Konva.
 */
export interface DimensionLabel {
  /** Anchor point for the label center in canvas space */
  anchorX: number;
  anchorY: number;
  /** Half-width of the rendered box (= Konva offsetX) */
  halfBoxW: number;
  /** Half-height of the rendered box (= Konva offsetY) */
  halfBoxH: number;
  /** Formatted text (e.g. "250cm") */
  text: string;
  /** Rotation angle in degrees — never upside-down (clamped to [-90, 90]) */
  angleDeg: number;
  /** Length of the segment in canvas pixels */
  lengthPx: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the live dimension label for the segment (x1,y1)→(x2,y2).
 *
 * The anchor is placed at the segment midpoint offset perpendicular by
 * LIVE_LABEL_OFFSET — always on the left side of the direction of travel
 * (consistent with DIM_OFFSET side=1 convention in dimensionGeometry).
 */
export const computeDimensionLabel = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  formattedText: string,
): DimensionLabel => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthPx = Math.hypot(dx, dy) || 1;

  // Unit direction and left-hand perpendicular
  const ux = dx / lengthPx;
  const uy = dy / lengthPx;
  const px = -uy; // left perp x
  const py = ux; // left perp y

  // Anchor = midpoint + perpendicular offset
  const anchorX = (x1 + x2) / 2 + px * LIVE_LABEL_OFFSET;
  const anchorY = (y1 + y2) / 2 + py * LIVE_LABEL_OFFSET;

  // Readable angle: clamp to [-90, 90] so text is never upside-down
  let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angleDeg > 90 || angleDeg < -90) angleDeg += 180;

  // Precise box metrics
  const textWidth = formattedText.length * CHAR_WIDTH;
  const boxW = textWidth + LABEL_PADDING * 2;
  const boxH = LINE_HEIGHT + LABEL_PADDING * 2;

  return {
    anchorX,
    anchorY,
    halfBoxW: boxW / 2,
    halfBoxH: boxH / 2,
    text: formattedText,
    angleDeg,
    lengthPx,
  };
};
