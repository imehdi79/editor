/**
 * geometry — small pure helpers shared by the wall-junction builders.
 *
 * Kept separate from classifyJunction so the join-style resolvers can use the
 * line math without pulling in classification. No existing util exposes an
 * infinite-line intersection (computeRoomAreas' segIntersect is clamped to a
 * segment), so it lives here.
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** Numerical tolerance for treating a determinant as zero (parallel lines). */
const PARALLEL_EPS = 1e-9;

/**
 * Intersection of two infinite lines, each given by a point and a direction.
 * Returns null when the lines are parallel (or anti-parallel).
 */
export const intersectLines = (
  ox1: number,
  oy1: number,
  dx1: number,
  dy1: number,
  ox2: number,
  oy2: number,
  dx2: number,
  dy2: number,
): Vec2 | null => {
  const det = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(det) < PARALLEL_EPS) return null;
  const t = ((ox2 - ox1) * dy2 - (oy2 - oy1) * dx2) / det;
  return { x: ox1 + t * dx1, y: oy1 + t * dy1 };
};
