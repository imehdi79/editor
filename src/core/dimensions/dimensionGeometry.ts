/**
 * dimensionGeometry.ts — Layer 1 of the dimension system.
 *
 * Pure geometry: given a segment (x1,y1)→(x2,y2), computes every geometric
 * primitive that a CAD dimension annotation requires:
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │                                                         │
 *   │   ←——————————— dimension line ———————————→             │
 *   │   |           [  label text  ]            |            │
 *   │   ↑ ext line 1                 ext line 2 ↑            │
 *   │   ╷                                       ╷            │
 *   │   ● p1                               p2 ●             │
 *   │                    segment                             │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Coordinate system: canvas pixels, y-down (Konva / browser convention).
 * All outputs are in canvas space — callers never do trig themselves.
 *
 * No React, no store, no side effects.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Distance from the segment to the dimension line, in canvas pixels. */
export const DIM_OFFSET = 22;

/**
 * Gap between the segment endpoint and the start of the extension line.
 * Prevents the witness line from touching the shape itself.
 */
export const EXT_LINE_GAP = 4;

/** How far the extension line overshoots the dimension line. */
export const EXT_LINE_OVERSHOOT = 5;

/** Half-size of the tick mark (architectural style terminator). */
export const TICK_HALF = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Point2D {
  x: number;
  y: number;
}

export interface LineSegment2D {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * All geometric primitives for one CAD dimension annotation.
 * Every coordinate is in final canvas space — the renderer just draws.
 */
export interface DimensionGeometry {
  /** Left/start extension (witness) line */
  extLine1: LineSegment2D;
  /** Right/end extension (witness) line */
  extLine2: LineSegment2D;
  /**
   * The full dimension line from terminator to terminator.
   * The label sits in a gap cut out of this line by the renderer.
   */
  dimLine: LineSegment2D;
  /** Center anchor of the label — rotation pivot for text centering */
  labelAnchor: Point2D;
  /**
   * Rotation angle for label text in degrees.
   * Always in [-90, 90] so text is never upside-down.
   */
  angleDeg: number;
  /** Length of the measured segment in canvas pixels */
  lengthPx: number;
  /**
   * Unit perpendicular direction (from segment toward the dimension line).
   * Used by the collision resolver to flip the label to the other side.
   */
  perpDir: Point2D;
  /** The side multiplier (+1 or -1) used to generate this geometry */
  side: 1 | -1;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Normalised direction vector of a segment. */
const segDir = (x1: number, y1: number, x2: number, y2: number): Point2D => {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  return { x: (x2 - x1) / len, y: (y2 - y1) / len };
};

/** Left-hand perpendicular of a unit direction (rotated -90°, y-down). */
const leftPerp = (d: Point2D): Point2D => ({ x: -d.y, y: d.x });

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute all geometric primitives for a single dimension annotation.
 *
 * @param x1, y1   Start of the measured segment
 * @param x2, y2   End of the measured segment
 * @param side     +1 = dimension line on the left/above the segment direction,
 *                 -1 = right/below. Default +1.
 * @param offset   Override the DIM_OFFSET constant (used by collision resolver).
 */
export const computeSegmentDimension = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  side: 1 | -1 = 1,
  offset: number = DIM_OFFSET,
): DimensionGeometry => {
  const dir = segDir(x1, y1, x2, y2);
  const perp = leftPerp(dir); // unit perpendicular

  // The offset direction: perp * side * offset
  const ox = perp.x * side * offset;
  const oy = perp.y * side * offset;

  // Extension line start points (gap from segment endpoint)
  const ext1Start: Point2D = {
    x: x1 + perp.x * side * EXT_LINE_GAP,
    y: y1 + perp.y * side * EXT_LINE_GAP,
  };
  const ext2Start: Point2D = {
    x: x2 + perp.x * side * EXT_LINE_GAP,
    y: y2 + perp.y * side * EXT_LINE_GAP,
  };

  // Extension line end points (overshoot past dimension line)
  const ext1End: Point2D = {
    x: x1 + ox + perp.x * side * EXT_LINE_OVERSHOOT,
    y: y1 + oy + perp.y * side * EXT_LINE_OVERSHOOT,
  };
  const ext2End: Point2D = {
    x: x2 + ox + perp.x * side * EXT_LINE_OVERSHOOT,
    y: y2 + oy + perp.y * side * EXT_LINE_OVERSHOOT,
  };

  // Dimension line endpoints (at offset distance from segment)
  const dl1: Point2D = { x: x1 + ox, y: y1 + oy };
  const dl2: Point2D = { x: x2 + ox, y: y2 + oy };

  // Label anchor at the midpoint of the dimension line
  const labelAnchor: Point2D = {
    x: (dl1.x + dl2.x) / 2,
    y: (dl1.y + dl2.y) / 2,
  };

  // Rotation angle: follow the segment, flip to keep text readable (never upside-down)
  let angleDeg = Math.atan2(dir.y, dir.x) * (180 / Math.PI);
  if (angleDeg > 90 || angleDeg < -90) angleDeg += 180;

  const lengthPx = Math.hypot(x2 - x1, y2 - y1);

  return {
    extLine1: { x1: ext1Start.x, y1: ext1Start.y, x2: ext1End.x, y2: ext1End.y },
    extLine2: { x1: ext2Start.x, y1: ext2Start.y, x2: ext2End.x, y2: ext2End.y },
    dimLine: { x1: dl1.x, y1: dl1.y, x2: dl2.x, y2: dl2.y },
    labelAnchor,
    angleDeg,
    lengthPx,
    perpDir: { x: perp.x * side, y: perp.y * side },
    side,
  };
};

/**
 * Recompute geometry with a different side (+1/-1) — used by the collision
 * resolver when flipping a label to the other side of its segment.
 */
export const flipDimensionSide = (
  geom: DimensionGeometry,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offset?: number,
): DimensionGeometry =>
  computeSegmentDimension(x1, y1, x2, y2, geom.side === 1 ? -1 : 1, offset);

/**
 * Recompute geometry with an increased offset — used by the collision
 * resolver when pushing a label further from the segment.
 */
export const pushDimensionOffset = (
  geom: DimensionGeometry,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  newOffset: number,
): DimensionGeometry =>
  computeSegmentDimension(x1, y1, x2, y2, geom.side, newOffset);
