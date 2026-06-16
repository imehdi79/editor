/**
 * wallAngles — user-facing angle readouts for segments, CAD-style.
 *
 * Two angle concepts, mirroring how CAD / architecture tools present them:
 *
 *  1. Absolute angle (bearing): the segment's direction measured from the
 *     positive X axis (East = 0°), counter-clockwise positive, range [0, 360).
 *     Canvas Y points DOWN, so we negate dy to keep CCW = up = positive,
 *     matching the user's intuition and AutoCAD's polar readout.
 *
 *  2. Corner (interior) angle: the included angle between this segment and a
 *     previously-drawn wall that shares the start vertex — the protractor
 *     reading of the corner, range [0, 180]. Only meaningful while chaining.
 *
 * Pure — no React, no store, no canvas.
 */

import type { Shape } from "@/core/drawing-engine/drawing.types";

const RAD2DEG = 180 / Math.PI;

/** Tolerance (px) for treating a wall endpoint as coincident with a vertex. */
const VERTEX_EPSILON = 1.0;

/**
 * Absolute bearing of (x1,y1)→(x2,y2): East = 0°, CCW positive, range [0, 360).
 * Y is negated because canvas Y grows downward.
 */
export const absoluteAngleDeg = (x1: number, y1: number, x2: number, y2: number): number => {
  const deg = Math.atan2(-(y2 - y1), x2 - x1) * RAD2DEG;
  return ((deg % 360) + 360) % 360;
};

/** Format an angle for display, e.g. 30 → "30°". Drops a trailing ".0". */
export const formatAngle = (deg: number): string => {
  const rounded = Math.round(deg * 10) / 10;
  return `${rounded % 1 === 0 ? rounded : rounded.toFixed(1)}°`;
};

/**
 * Included angle at vertex V between rays V→A and V→B, in [0, 180].
 * Returns 0 if either ray is degenerate.
 */
export const includedAngleDeg = (
  vx: number,
  vy: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number => {
  const a1x = ax - vx;
  const a1y = ay - vy;
  const b1x = bx - vx;
  const b1y = by - vy;
  const la = Math.hypot(a1x, a1y);
  const lb = Math.hypot(b1x, b1y);
  if (la < 1e-6 || lb < 1e-6) return 0;
  const cos = Math.max(-1, Math.min(1, (a1x * b1x + a1y * b1y) / (la * lb)));
  return Math.acos(cos) * RAD2DEG;
};

/** Geometry for drawing a corner-angle arc at a chained vertex. */
export interface CornerAngle {
  /** Vertex (shared start point) in canvas space */
  vx: number;
  vy: number;
  /** Screen-space (canvas, Y-down) start/end angles of the arc, in radians */
  startRad: number;
  endRad: number;
  /** Whether the canvas arc should sweep counter-clockwise (the minor arc) */
  anticlockwise: boolean;
  /** Bisector direction (radians, screen-space) — used to place the label */
  midRad: number;
  /** Included angle in degrees, range [0, 180] */
  cornerDeg: number;
}

/**
 * If (startX,startY) coincides with an endpoint of an existing wall, compute
 * the corner angle between that wall and the new ray start→(curX,curY).
 *
 * Returns null when no wall shares the vertex (first wall / free draw) or when
 * either ray is degenerate.
 */
export const cornerAngleAtVertex = (
  startX: number,
  startY: number,
  curX: number,
  curY: number,
  shapes: Record<string, Shape>,
): CornerAngle | null => {
  // Find a committed wall whose endpoint sits on the vertex; the OTHER endpoint
  // gives the direction of the previous wall away from the corner.
  let prev: { ox: number; oy: number } | null = null;
  for (const s of Object.values(shapes)) {
    if (s.type !== "wall") continue;
    if (Math.hypot(s.x1 - startX, s.y1 - startY) <= VERTEX_EPSILON) {
      prev = { ox: s.x2, oy: s.y2 };
      break;
    }
    if (Math.hypot(s.x2 - startX, s.y2 - startY) <= VERTEX_EPSILON) {
      prev = { ox: s.x1, oy: s.y1 };
      break;
    }
  }
  if (!prev) return null;

  // Degenerate previous wall or zero-length new ray → no meaningful corner.
  if (
    Math.hypot(prev.ox - startX, prev.oy - startY) < 1e-6 ||
    Math.hypot(curX - startX, curY - startY) < 1e-6
  ) {
    return null;
  }

  const cornerDeg = includedAngleDeg(startX, startY, prev.ox, prev.oy, curX, curY);

  // Screen-space angles for the canvas arc (no Y negation — canvas draws here).
  const startRad = Math.atan2(prev.oy - startY, prev.ox - startX);
  const endRad = Math.atan2(curY - startY, curX - startX);

  // Sweep the MINOR arc between the two rays.
  let d = endRad - startRad;
  while (d <= -Math.PI) d += 2 * Math.PI;
  while (d > Math.PI) d -= 2 * Math.PI;

  return {
    vx: startX,
    vy: startY,
    startRad,
    endRad,
    anticlockwise: d < 0,
    midRad: startRad + d / 2,
    cornerDeg,
  };
};
