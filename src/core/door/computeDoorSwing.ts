/**
 * computeDoorSwing — pure geometry for door rendering.
 *
 * Derives all rendering primitives from DoorShape's two independent
 * properties (hingeSide, swingDirection) so renderers contain zero
 * door-state logic.
 *
 * Coordinate convention: canvas y-down. Wall direction = x1→x2.
 * Left-hand normal = perpendicular rotated +90° from wall direction
 * = (-dy, dx) / len. This points "inward" relative to a conventionally
 * drawn wall (left side when walking x1→x2).
 *
 * Open-angle derivation
 * ─────────────────────
 * The door leaf is always a rigid rod of length = door width, pivoting
 * at the hinge. "Closed" = leaf pointing from hinge toward the other
 * jamb (along the wall). "Open" (90°) = leaf perpendicular to the wall,
 * on the swing side.
 *
 * The open direction is the left-hand normal scaled by sn
 * (sn = +1 for inward, −1 for outward):
 *
 *   openAngle = atan2(lhn_y × sn, lhn_x × sn)
 *
 * This formula is hinge-side-agnostic: it derives the open angle
 * directly from the wall's left-hand normal rather than rotating the
 * leaf vector, which avoids a sign reversal that would otherwise affect
 * the right-hinge case.
 *
 * Arc direction (counterClockwise)
 * ─────────────────────────────────
 * Canvas arc(ccw=false) sweeps clockwise on screen (increasing angle in
 * y-down space). We determine ccw from the signed angular distance from
 * closedAngle to openAngle (wrapped to (−π, π]): if that distance is
 * negative, the arc must travel counter-clockwise → ccw=true.
 */

import type { DoorShape } from "@/core/drawing-engine/drawing.types";

export interface DoorSwingGeometry {
  /** Hinge point in canvas space */
  hinge: { x: number; y: number };
  /** Far end of the door leaf when closed (the non-hinge jamb) */
  leaf: { x: number; y: number };
  /** Door leaf endpoint when fully open (90° from closed) */
  open: { x: number; y: number };
  /** Arc start angle in radians */
  arcStartRad: number;
  /** Arc end angle in radians */
  arcEndRad: number;
  /** True = arc drawn counter-clockwise in canvas coords (y-down) */
  counterClockwise: boolean;
  /** Radius of the swing arc = door width in px */
  radius: number;
}

export const computeDoorSwing = (shape: DoorShape | Omit<DoorShape, "id">): DoorSwingGeometry => {
  const { x1, y1, x2, y2, hingeSide, swingDirection } = shape;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  // Left-hand normal: rotate wall direction +90° → (-dy, dx) / len
  const nx = -uy; // = -dy / len
  const ny = ux; // =  dx / len

  // Hinge and leaf endpoints
  const hinge = hingeSide === "left" ? { x: x1, y: y1 } : { x: x2, y: y2 };
  const leaf = hingeSide === "left" ? { x: x2, y: y2 } : { x: x1, y: y1 };

  // Unit vector from hinge toward leaf (closed door direction)
  const lx = hingeSide === "left" ? ux : -ux;
  const ly = hingeSide === "left" ? uy : -uy;

  // +1 = swing toward left-hand normal (inward), -1 = away (outward)
  const sn = swingDirection === "inward" ? 1 : -1;

  const radius = len;
  const closedAngleRad = Math.atan2(ly, lx);

  // Open angle: the door leaf points in the wall-normal direction scaled by sn.
  // Derived directly from the left-hand normal — NOT from rotating the leaf
  // vector — so the formula is correct for both hinge sides.
  const openAngleRad = Math.atan2(ny * sn, nx * sn);

  // Determine arc sweep direction from the signed angular distance
  // closed → open, wrapped to (−π, π].
  // Negative diff → must travel counter-clockwise (ccw=true on canvas).
  //
  // JS '%' keeps the sign of the dividend, so the naive
  // ((d + π) % 2π) − π fails to wrap when d < −π (e.g. a wall pointing toward
  // the lower-left with an inward swing yields d = −3π/2). That produced a
  // −3π/2 "distance", flipping the sweep so the arc rendered as a 3/4 circle
  // on the wrong side. Normalise explicitly into (−π, π] instead.
  const TWO_PI = 2 * Math.PI;
  let diff = (openAngleRad - closedAngleRad) % TWO_PI;
  if (diff <= -Math.PI) diff += TWO_PI;
  else if (diff > Math.PI) diff -= TWO_PI;
  const counterClockwise = diff < 0;

  return {
    hinge,
    leaf,
    open: {
      x: hinge.x + Math.cos(openAngleRad) * radius,
      y: hinge.y + Math.sin(openAngleRad) * radius,
    },
    arcStartRad: closedAngleRad,
    arcEndRad: openAngleRad,
    counterClockwise,
    radius,
  };
};
