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
import type { CornerAngle, DimensionLabel } from "@/core/drawing-engine/drawing.types";

/** DimensionLabel's canonical definition lives in the drawing-engine type hub
 *  (drawing.types) so DrawingHints can reference it without an import cycle;
 *  re-exported here because this module builds and owns the value. */
export type { DimensionLabel };

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
  absAngleDeg: number = 0,
  corner: CornerAngle | null = null,
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
    absAngleDeg,
    corner,
  };
};
