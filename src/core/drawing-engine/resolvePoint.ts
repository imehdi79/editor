/**
 * resolvePoint — the coordinate transformation pipeline.
 *
 * A pure function that takes a raw pointer position and passes it through
 * every active constraint layer in order:
 *   1. Grid snap
 *   2. Point snap  (node / midpoint / intersection / wall body)
 *   3. Perpendicular lock  (dragging; suppressed only by a hard *node* snap)
 *   4. Axis lock           (dragging, not perp-locked; suppressed only by a node snap)
 *                          — for a soft (non-node) snap the lock is reconciled with
 *                            the snap so the wall stays orthogonal *and* connected.
 *   5. Alignment guides    (visual + optional coordinate correction)
 *   6. Dimension label     (computed for live feedback while dragging)
 *
 * This function has no React dependencies and no side effects — it can be
 * called from useDrawingEngine, a future useSelectionEngine (for move/resize),
 * useRotationEngine, or any other interaction layer.
 */

import { snapPointToGrid } from "@/core/snapping/snapToGrid";
import { snapToPoints } from "@/core/snapping/snapToPoints";
import { applyAxisLock } from "@/core/snapping/axisLock";
import { applyPerpendicularLock } from "@/core/snapping/perpendicularLock";
import { computeAlignmentGuides } from "@/core/guides/alignmentGuides";
import { computeDimensionLabel } from "@/core/dimensions/computeDimensions";
import { formatDimension } from "@/core/dimensions/dimensionUnits";
import { absoluteAngleDeg, cornerAngleAtVertex, formatAngle } from "@/core/wall-utils/wallAngles";
import type { Shape, SnapResult, GuideLine } from "./drawing.types";
import type { DimensionLabel } from "@/core/dimensions/computeDimensions";
import type { DimensionUnit } from "@/store/editor.store";

// ---------------------------------------------------------------------------
// Config passed in by the caller (sourced from stores in the hook layer)
// ---------------------------------------------------------------------------

export interface ResolveConfig {
  snapGrid: number;
  snapRadius: number;
  /** Alignment-guide snap distance (px) — see editor.store `guideThreshold`. */
  guideThreshold: number;
  /** Perpendicular-lock tolerance (degrees) — see editor.store `perpThreshold`. */
  perpThreshold: number;
  axisAngleThreshold: number;
  dimensionUnit: DimensionUnit;
  pixelsPerMeter: number;
  shapes: Record<string, Shape>;
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export interface ResolveResult {
  /** Final resolved coordinates */
  x: number;
  y: number;
  /** Point-snap details (node / midpoint / intersection) */
  pointSnap: SnapResult;
  /** Active alignment guide lines to render */
  guides: GuideLine[];
  /** Whether the axis lock constraint is active */
  axisLocked: boolean;
  /** Which axis is locked */
  axisLockAngle: "horizontal" | "vertical" | null;
  /** Whether the perpendicular lock constraint is active */
  perpLocked: boolean;
  /** Live dimension label while dragging (null when no start point) */
  dimension: DimensionLabel | null;
}

// ---------------------------------------------------------------------------
// Soft-snap reconciliation
// ---------------------------------------------------------------------------

const LINE_EPS = 1e-9;

/**
 * Reconcile a *soft* (non-node) point snap with an engaged directional lock.
 *
 * The lock constrains the endpoint to the ray start → (lockX, lockY). We want the
 * wall to stay BOTH on that line AND connected to whatever it snapped to:
 *   - edge (wall body): the point where the lock line crosses the host wall —
 *     so a wall drawn onto another wall's body stays orthogonal and joins it.
 *   - midpoint / intersection: that exact point, but only when it already lies on
 *     the lock line (otherwise the discrete target is off-axis and can't be kept).
 *
 * Returns null to keep the pure lock position (no compatible connection).
 */
const reconcileSnapWithLock = (
  startX: number,
  startY: number,
  lockX: number,
  lockY: number,
  snap: SnapResult,
  shapes: Record<string, Shape>,
): { x: number; y: number } | null => {
  const dx = lockX - startX;
  const dy = lockY - startY;
  const lineLenSq = dx * dx + dy * dy;
  if (lineLenSq < LINE_EPS) return null;

  // Wall body: intersect the infinite lock line (start + t·d) with the host wall.
  if (snap.snapType === "edge" && snap.snappedShapeId) {
    const host = shapes[snap.snappedShapeId];
    if (!host || host.type === "text") return null;
    const wx = host.x2 - host.x1;
    const wy = host.y2 - host.y1;
    const denom = dx * wy - dy * wx;
    if (Math.abs(denom) < LINE_EPS) return null; // parallel — no orthogonal join
    const qpx = host.x1 - startX;
    const qpy = host.y1 - startY;
    const t = (qpx * wy - qpy * wx) / denom; // along the lock ray
    const u = (qpx * dy - qpy * dx) / denom; // along the host wall (0..1 = on it)
    if (t <= 0 || u < 0 || u > 1) return null; // behind start or off the wall
    return { x: startX + t * dx, y: startY + t * dy };
  }

  // Discrete snap (midpoint / intersection): keep it only if it sits on the line.
  if (snap.snappedTo) {
    const { x: sx, y: sy } = snap.snappedTo;
    const distToLine = Math.abs((sx - startX) * dy - (sy - startY) * dx) / Math.sqrt(lineLenSq);
    if (distToLine < 0.5) return { x: sx, y: sy };
  }
  return null;
};

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/**
 * @param rawX      Raw pointer X in stage/canvas space
 * @param rawY      Raw pointer Y in stage/canvas space
 * @param config    Settings sourced from editor + floor-plan stores
 * @param startX    Drag origin X — enables drag-only constraints (axis/perp lock, dimension)
 * @param startY    Drag origin Y — enables drag-only constraints (axis/perp lock, dimension)
 */
export const resolvePoint = (
  rawX: number,
  rawY: number,
  config: ResolveConfig,
  startX?: number,
  startY?: number,
): ResolveResult => {
  const { snapGrid, snapRadius, guideThreshold, perpThreshold, axisAngleThreshold, dimensionUnit, pixelsPerMeter, shapes } = config;
  const hasDragOrigin = startX !== undefined && startY !== undefined;

  // 1. Grid snap
  const gridSnapped = snapPointToGrid(rawX, rawY, snapGrid);

  // 2. Point snap — node, midpoint, intersection
  const pointSnap: SnapResult = snapToPoints(gridSnapped.x, gridSnapped.y, shapes, 1, snapRadius);
  let { x, y } = pointSnap;

  // 3 & 4. Directional locks (perpendicular, then axis). A node snap is a hard
  // connection to an existing corner and suppresses the locks. Non-node snaps
  // (wall body / midpoint / intersection) are *soft*: the locks still engage and
  // are reconciled with the snap, so a wall connected to another wall's body still
  // stays horizontal/vertical (or perpendicular) — same as drawing in open space.
  const isNodeSnap = pointSnap.snapped && pointSnap.snapType === "node";
  let perpLocked = false;
  let axisLocked = false;
  let axisLockAngle: "horizontal" | "vertical" | null = null;

  if (hasDragOrigin && !isNodeSnap) {
    // Detect the lock from the raw (grid-snapped) cursor direction, so a soft
    // snap that pulled the point off-axis doesn't hide the lock.
    const perp = applyPerpendicularLock(startX!, startY!, gridSnapped.x, gridSnapped.y, shapes, perpThreshold);
    if (perp.locked) {
      perpLocked = true;
      const hit = pointSnap.snapped ? reconcileSnapWithLock(startX!, startY!, perp.x, perp.y, pointSnap, shapes) : null;
      x = hit?.x ?? perp.x;
      y = hit?.y ?? perp.y;
    } else {
      const locked = applyAxisLock(startX!, startY!, gridSnapped.x, gridSnapped.y, axisAngleThreshold);
      if (locked.locked) {
        axisLocked = true;
        axisLockAngle = locked.axis;
        const hit = pointSnap.snapped ? reconcileSnapWithLock(startX!, startY!, locked.x, locked.y, pointSnap, shapes) : null;
        x = hit?.x ?? locked.x;
        y = hit?.y ?? locked.y;
      }
    }
  }

  // 5. Alignment guides — computed from the final coordinate
  const { guides, snappedX, snappedY } = computeAlignmentGuides(x, y, shapes, guideThreshold);
  if (!pointSnap.snapped && !axisLocked) {
    if (snappedX !== null) x = snappedX;
    if (snappedY !== null) y = snappedY;
  }

  // 6. Dimension label — only while dragging
  let dimension: DimensionLabel | null = null;
  if (hasDragOrigin) {
    const lengthPx = Math.hypot(x - startX!, y - startY!);
    if (lengthPx > 4) {
      const absDeg = absoluteAngleDeg(startX!, startY!, x, y);
      const corner = cornerAngleAtVertex(startX!, startY!, x, y, shapes);
      const lengthText = formatDimension(lengthPx, dimensionUnit, pixelsPerMeter);
      // CAD-style polar readout: length and absolute bearing on one line.
      const text = `${lengthText}  ${formatAngle(absDeg)}`;
      dimension = computeDimensionLabel(startX!, startY!, x, y, text, absDeg, corner);
    }
  }

  return { x, y, pointSnap, guides, axisLocked, axisLockAngle, perpLocked, dimension };
};
