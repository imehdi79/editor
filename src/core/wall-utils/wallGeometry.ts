/**
 * wallGeometry — pure geometry helpers for wall-attached openings.
 *
 * Window and door shapes are always placed on walls. These utilities:
 *  1. Find the nearest wall to a pointer position
 *  2. Project a point onto a wall segment (clamped to valid range)
 *  3. Compute the parametric position (t ∈ [0,1]) along a wall
 *  4. Convert parametric positions back to canvas coordinates
 *  5. Build the final opening endpoints from a centre t and half-width
 *
 * All functions are pure — no React, no store access.
 */

import type { WallShape, Shape, ShapeId } from "@/core/drawing-engine/drawing.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WallProjection {
  /** The wall shape that was hit */
  wall: WallShape;
  /** Parametric position along the wall (0 = start, 1 = end) */
  t: number;
  /** The projected point in canvas space */
  x: number;
  y: number;
  /** Distance from the original pointer to the projected point */
  dist: number;
}

export interface OpeningGeometry {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** The clamped t at the start of the opening */
  t1: number;
  /** The clamped t at the end of the opening */
  t2: number;
  /** The wall length in pixels */
  wallLength: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Length of a wall segment in canvas pixels. */
export const wallLength = (wall: WallShape): number => Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);

/** Project a point onto a wall segment, returning the clamped t ∈ [0,1]. */
export const projectOntoWall = (px: number, py: number, wall: WallShape): WallProjection => {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const lenSq = dx * dx + dy * dy;

  // Degenerate wall — treat as point
  if (lenSq < 1e-10) {
    return { wall, t: 0, x: wall.x1, y: wall.y1, dist: Math.hypot(px - wall.x1, py - wall.y1) };
  }

  const rawT = ((px - wall.x1) * dx + (py - wall.y1) * dy) / lenSq;
  const t = Math.max(0, Math.min(1, rawT));
  const x = wall.x1 + t * dx;
  const y = wall.y1 + t * dy;
  const dist = Math.hypot(px - x, py - y);

  return { wall, t, x, y, dist };
};

/**
 * Find the nearest wall to a pointer position within snapRadius.
 * Returns null if no wall is within range.
 */
export const findNearestWall = (
  px: number,
  py: number,
  shapes: Record<string, Shape>,
  snapRadius: number,
): WallProjection | null => {
  let best: WallProjection | null = null;

  for (const shape of Object.values(shapes)) {
    if (shape.type !== "wall") continue;
    const proj = projectOntoWall(px, py, shape);
    if (proj.dist <= snapRadius && (best === null || proj.dist < best.dist)) {
      best = proj;
    }
  }

  return best;
};

/**
 * Convert a parametric position t on a wall to canvas coordinates.
 */
export const wallPointAtT = (wall: WallShape, t: number): { x: number; y: number } => ({
  x: wall.x1 + t * (wall.x2 - wall.x1),
  y: wall.y1 + t * (wall.y2 - wall.y1),
});

/**
 * Given a centre t and half-width in pixels, compute the clamped
 * opening endpoints and t values for a wall opening (window or door).
 *
 * The opening is always at least minWidth pixels wide. It is clamped so
 * the opening cannot extend past either end of the wall.
 */
export const computeOpeningGeometry = (
  wall: WallShape,
  centreT: number,
  halfWidthPx: number,
  minWidth: number = 20,
): OpeningGeometry => {
  const len = wallLength(wall);
  if (len < 1) {
    return { x1: wall.x1, y1: wall.y1, x2: wall.x1, y2: wall.y1, t1: 0, t2: 0, wallLength: len };
  }

  const effectiveHalf = Math.max(halfWidthPx, minWidth / 2);
  const halfT = effectiveHalf / len;

  // Clamp so opening stays within wall bounds
  const t1 = Math.max(0, Math.min(1 - 2 * halfT, centreT - halfT));
  const t2 = Math.min(1, t1 + 2 * halfT);

  const p1 = wallPointAtT(wall, t1);
  const p2 = wallPointAtT(wall, t2);

  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, t1, t2, wallLength: len };
};

/**
 * Given the drag start and end points, determine the opening's centre t
 * and half-width, then return the full OpeningGeometry.
 *
 * The centre is the midpoint of (startT, endT); the width spans the drag.
 */
export const openingGeometryFromDrag = (
  wall: WallShape,
  startT: number,
  endT: number,
  minWidth: number = 20,
): OpeningGeometry => {
  const len = wallLength(wall);
  const centreT = (startT + endT) / 2;
  const halfWidthPx = (Math.abs(endT - startT) * len) / 2;
  return computeOpeningGeometry(wall, centreT, halfWidthPx, minWidth);
};

/**
 * Compute the perpendicular normal of a wall (points to the "left" side
 * when walking from x1/y1 to x2/y2). Used for door swing arc.
 */
export const wallNormal = (wall: WallShape, side: 1 | -1): { nx: number; ny: number } => {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy) || 1;
  // Left normal: (-dy, dx) / len  →  side=+1 is left, side=-1 is right
  return { nx: (-dy / len) * side, ny: (dx / len) * side };
};

/**
 * Slide an opening (door or window) along its host wall so its centre lands
 * at the projection of (cursorX, cursorY) onto the wall.
 * The opening width (halfWidthPx) is preserved. Clamped to wall bounds.
 *
 * Returns new {x1,y1,x2,y2} in canvas space.
 */
export const slideOpening = (
  wall: WallShape,
  cursorX: number,
  cursorY: number,
  halfWidthPx: number,
  minWidth: number = 20,
): { x1: number; y1: number; x2: number; y2: number } => {
  const proj = projectOntoWall(cursorX, cursorY, wall);
  const geo = computeOpeningGeometry(wall, proj.t, halfWidthPx, minWidth);
  return { x1: geo.x1, y1: geo.y1, x2: geo.x2, y2: geo.y2 };
};

/**
 * Resize an opening by dragging one endpoint along the wall.
 * fixedT is the parametric position of the endpoint that stays fixed.
 * The dragged endpoint is projected onto the wall from the cursor position.
 * Returns new {x1,y1,x2,y2} in canvas space.
 */
export const resizeOpeningEndpoint = (
  wall: WallShape,
  fixedT: number,
  cursorX: number,
  cursorY: number,
  minWidth: number = 20,
): { x1: number; y1: number; x2: number; y2: number } => {
  const dragProj = projectOntoWall(cursorX, cursorY, wall);
  const len = wallLength(wall);
  const minT = minWidth / len;

  // Ensure the dragged t stays at least minWidth away from fixed t
  let dragT = dragProj.t;
  if (Math.abs(dragT - fixedT) < minT) {
    dragT = dragT > fixedT ? fixedT + minT : fixedT - minT;
  }
  dragT = Math.max(0, Math.min(1, dragT));

  // t1 is always the smaller t (wall direction preserved)
  const t1 = Math.min(fixedT, dragT);
  const t2 = Math.max(fixedT, dragT);
  const p1 = wallPointAtT(wall, t1);
  const p2 = wallPointAtT(wall, t2);
  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
};

/**
 * Parametric position (t) of a canvas point along the wall.
 * Assumes the point is already on the wall (e.g. a stored x1/y1).
 */
export const tOnWall = (px: number, py: number, wall: WallShape): number => {
  const proj = projectOntoWall(px, py, wall);
  return proj.t;
};

/**
 * Find the wall (by id) in the shapes map, or return null.
 */
export const findWallById = (id: ShapeId | null, shapes: Record<string, Shape>): WallShape | null => {
  if (!id) return null;
  const shape = shapes[id];
  return shape?.type === "wall" ? shape : null;
};
