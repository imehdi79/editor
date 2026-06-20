/**
 * measurementReference.ts — applies the editor's MeasurementReference to a
 * wall segment, returning the endpoints that should actually be *measured*.
 *
 * The stored wall line is always the CENTERLINE (x1,y1)→(x2,y2). What a
 * draughtsman measures depends on the reference:
 *
 *   "centerline" → measure the stored centerline as-is.
 *
 *   "inner"      → measure the clear (room-side) span. At each end where a
 *                  perpendicular wall joins, the measured endpoint is pulled
 *                  IN along this wall by the joining wall's half-thickness,
 *                  so the result is the face-to-face clear distance between
 *                  the perpendicular walls.
 *
 *   "outer"      → measure the overall span. At each joined end the measured
 *                  endpoint is pushed OUT by the joining wall's half-thickness,
 *                  giving the outside-to-outside overall distance.
 *
 * A "joining" wall at an endpoint is any other wall whose own endpoint sits on
 * this endpoint (shared topology node) and which is roughly perpendicular to
 * this wall. Free (un-joined) ends are left at the centerline endpoint, since
 * there is no perpendicular face to reference against.
 *
 * Pure: no React, no store, no side effects.
 */

import type { Shape, WallShape } from "@/core/drawing-engine/drawing.types";
import type { MeasurementReference } from "@/store/editor.store";
import { SNAP_EPSILON } from "@/core/topology/computeTopology";
import type { WallOutline } from "@/core/wall-junctions";

export interface MeasuredSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Roughly-perpendicular test: |cos(angle between)| below this = perpendicular. */
const PERP_COS_TOLERANCE = 0.26; // ~75°..105°

const isWall = (s: Shape): s is WallShape => s.type === "wall";

const samePoint = (ax: number, ay: number, bx: number, by: number): boolean =>
  Math.abs(ax - bx) <= SNAP_EPSILON && Math.abs(ay - by) <= SNAP_EPSILON;

/**
 * Find the half-thickness adjustment contributed by perpendicular walls that
 * join `wall` at the given endpoint. Returns the largest joining half-thickness
 * (0 when the end is free or only collinear walls join).
 */
const junctionHalfThickness = (
  wall: WallShape,
  end: "p1" | "p2",
  shapes: Record<string, Shape>,
): number => {
  const ex = end === "p1" ? wall.x1 : wall.x2;
  const ey = end === "p1" ? wall.y1 : wall.y2;

  const ux = wall.x2 - wall.x1;
  const uy = wall.y2 - wall.y1;
  const ulen = Math.hypot(ux, uy) || 1;
  const wx = ux / ulen;
  const wy = uy / ulen;

  let maxHalf = 0;
  for (const other of Object.values(shapes)) {
    if (!isWall(other) || other.id === wall.id) continue;

    // Does `other` touch this endpoint at either of its ends?
    const touches =
      samePoint(other.x1, other.y1, ex, ey) || samePoint(other.x2, other.y2, ex, ey);
    if (!touches) continue;

    // Perpendicularity test
    const ox = other.x2 - other.x1;
    const oy = other.y2 - other.y1;
    const olen = Math.hypot(ox, oy) || 1;
    const cos = Math.abs((wx * ox + wy * oy) / olen);
    if (cos > PERP_COS_TOLERANCE) continue; // not perpendicular enough

    maxHalf = Math.max(maxHalf, other.thickness / 2);
  }

  return maxHalf;
};

/**
 * Inset (along the wall axis) of a mitred face corner from the wall endpoint.
 * Projecting the outline's inner/outer corner back onto the centreline gives the
 * exact face-to-face span at any junction angle — the perpendicular heuristic is
 * just its right-angle special case. Inner corners inset toward the centre
 * (positive), outer corners extend outward (negative), and free ends give 0.
 */
const measuredFromOutline = (wall: WallShape, outline: WallOutline, reference: "inner" | "outer"): MeasuredSegment => {
  const ux = wall.x2 - wall.x1;
  const uy = wall.y2 - wall.y1;
  const len = Math.hypot(ux, uy) || 1;
  const wx = ux / len;
  const wy = uy / len;
  const c1 = reference === "inner" ? outline.p1Inner : outline.p1Outer;
  const c2 = reference === "inner" ? outline.p2Inner : outline.p2Outer;
  const i1 = (c1.x - wall.x1) * wx + (c1.y - wall.y1) * wy; // signed inset at p1
  const i2 = (c2.x - wall.x2) * wx + (c2.y - wall.y2) * wy; // signed inset at p2
  return {
    x1: wall.x1 + wx * i1,
    y1: wall.y1 + wy * i1,
    x2: wall.x2 + wx * i2,
    y2: wall.y2 + wy * i2,
  };
};

/**
 * Compute the endpoints that should be measured for a wall under the given
 * reference mode. Endpoints are shifted ALONG the wall axis only (length
 * changes), never off-axis — the dimension layer still offsets perpendicular
 * for the witness lines.
 *
 * When `outline` is supplied, the inset comes from the true mitred face corners
 * (exact at any angle). Without it (e.g. during a live drag) the perpendicular
 * half-thickness heuristic is used as a fallback.
 */
export const measuredWallSegment = (
  wall: WallShape,
  shapes: Record<string, Shape>,
  reference: MeasurementReference,
  outline?: WallOutline,
): MeasuredSegment => {
  if (reference === "centerline") {
    return { x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 };
  }

  if (outline) return measuredFromOutline(wall, outline, reference);

  const ux = wall.x2 - wall.x1;
  const uy = wall.y2 - wall.y1;
  const len = Math.hypot(ux, uy) || 1;
  const wx = ux / len;
  const wy = uy / len;

  // sign: inner pulls endpoints toward the center (p1 +axis, p2 -axis);
  //       outer pushes them away from the center.
  const sign = reference === "inner" ? 1 : -1;

  const h1 = junctionHalfThickness(wall, "p1", shapes);
  const h2 = junctionHalfThickness(wall, "p2", shapes);

  return {
    x1: wall.x1 + wx * h1 * sign,
    y1: wall.y1 + wy * h1 * sign,
    x2: wall.x2 - wx * h2 * sign,
    y2: wall.y2 - wy * h2 * sign,
  };
};

/** Convenience: measured length in px for a wall under a reference. */
export const measuredWallLength = (
  wall: WallShape,
  shapes: Record<string, Shape>,
  reference: MeasurementReference,
): number => {
  const s = measuredWallSegment(wall, shapes, reference);
  return Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
};
