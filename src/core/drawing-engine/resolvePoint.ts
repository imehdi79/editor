/**
 * resolvePoint — the coordinate transformation pipeline.
 *
 * A pure function that takes a raw pointer position and passes it through
 * every active constraint layer in order:
 *   1. Grid snap
 *   2. Point snap  (node / midpoint / intersection)
 *   3. Perpendicular lock  (only when dragging and not yet point-snapped)
 *   4. Axis lock           (only when dragging and not perp-locked or point-snapped)
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
  const { snapGrid, snapRadius, axisAngleThreshold, dimensionUnit, pixelsPerMeter, shapes } = config;
  const hasDragOrigin = startX !== undefined && startY !== undefined;

  // 1. Grid snap
  const gridSnapped = snapPointToGrid(rawX, rawY, snapGrid);

  // 2. Point snap — node, midpoint, intersection
  const pointSnap: SnapResult = snapToPoints(gridSnapped.x, gridSnapped.y, shapes, 1, snapRadius);
  let { x, y } = pointSnap;

  // 3. Perpendicular lock — only while dragging and not yet point-snapped
  let perpLocked = false;
  if (hasDragOrigin && !pointSnap.snapped) {
    const perp = applyPerpendicularLock(startX!, startY!, x, y, shapes);
    if (perp.locked) {
      x = perp.x;
      y = perp.y;
      perpLocked = true;
    }
  }

  // 4. Axis lock — only while dragging, not perp-locked, not point-snapped
  let axisLocked = false;
  let axisLockAngle: "horizontal" | "vertical" | null = null;
  if (hasDragOrigin && !perpLocked && !pointSnap.snapped) {
    const locked = applyAxisLock(startX!, startY!, x, y, axisAngleThreshold);
    if (locked.locked) {
      x = locked.x;
      y = locked.y;
      axisLocked = true;
      axisLockAngle = locked.axis;
    }
  }

  // 5. Alignment guides — computed from the final coordinate
  const { guides, snappedX, snappedY } = computeAlignmentGuides(x, y, shapes);
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
