/**
 * useSelectionEngine — interaction logic for the select tool.
 *
 * Intentionally simple foundation:
 *  - Click on a shape → select it
 *  - Click on empty canvas → deselect
 *
 * Ready to extend with:
 *  - Multi-selection (shift-click, drag-rect)
 *  - Move (drag selected shape)
 *  - Resize (handle drag, reusing resolvePoint from the pipeline)
 *  - Rotation (angle handle drag)
 *
 * Uses resolvePoint for pointer normalisation so snapping/grid behaviour
 * is consistent with drawing tools.
 */

import { useCallback } from "react";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useSelectionStore } from "@/store/selection.store";
import { useEditorStore } from "@/store/editor.store";
import { resolvePoint, type ResolveConfig } from "@/core/drawing-engine/resolvePoint";
import type { Shape } from "@/core/drawing-engine/drawing.types";

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Squared distance from point (px, py) to segment (ax,ay)→(bx,by). */
const pointToSegmentDistSq = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return (px - ax) ** 2 + (py - ay) ** 2;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2;
};

/** Hit-test radius in pixels — generous for touch targets. */
const HIT_RADIUS = 8;

/**
 * Returns the topmost shape that the pointer lands on, or null.
 * Iterates in reverse insertion order so later shapes are "on top".
 */
const hitTest = (x: number, y: number, shapes: Record<string, Shape>): string | null => {
  const radiusSq = HIT_RADIUS ** 2;

  // Reverse so shapes drawn later are tested first (visual top)
  const entries = Object.values(shapes).reverse();

  for (const shape of entries) {
    if (shape.type === "text") {
      // Simple proximity check for text anchors
      if ((x - shape.x) ** 2 + (y - shape.y) ** 2 < radiusSq * 4) return shape.id;
      continue;
    }

    // window and door share the same segment geometry contract as wall/line
    if (shape.type === "window" || shape.type === "door") {
      const effectiveRadiusSq = Math.max(radiusSq, (shape.thickness / 2) ** 2);
      if (pointToSegmentDistSq(x, y, shape.x1, shape.y1, shape.x2, shape.y2) <= effectiveRadiusSq) {
        return shape.id;
      }
      continue;
    }

    const thickness = shape.type === "wall" ? shape.thickness / 2 : 0;
    const effectiveRadiusSq = Math.max(radiusSq, thickness ** 2);

    if (pointToSegmentDistSq(x, y, shape.x1, shape.y1, shape.x2, shape.y2) <= effectiveRadiusSq) {
      return shape.id;
    }
  }

  return null;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useSelectionEngine = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const selectShape = useSelectionStore((s) => s.selectShape);

  const snapGrid = useEditorStore((s) => s.snapGrid);
  const axisAngleThreshold = useEditorStore((s) => s.axisAngleThreshold);
  const snapRadius = useEditorStore((s) => s.snapRadius);
  const dimensionUnit = useEditorStore((s) => s.dimensionUnit);
  const pixelsPerMeter = useEditorStore((s) => s.pixelsPerMeter);

  const makeConfig = useCallback(
    (): ResolveConfig => ({ snapGrid, axisAngleThreshold, snapRadius, dimensionUnit, pixelsPerMeter, shapes }),
    [snapGrid, axisAngleThreshold, snapRadius, dimensionUnit, pixelsPerMeter, shapes],
  );

  /** Click — resolve pointer then hit-test. */
  const onMouseDown = useCallback(
    (rawX: number, rawY: number) => {
      // Resolve through grid snap so coordinates are consistent
      const { x, y } = resolvePoint(rawX, rawY, makeConfig());
      const hit = hitTest(x, y, shapes);
      selectShape(hit);
    },
    [shapes, selectShape, makeConfig],
  );

  // No-ops for now — move/resize will be added here later
  const onMouseMove = useCallback((_rawX: number, _rawY: number) => {}, []);
  const onMouseUp = useCallback((_rawX: number, _rawY: number) => {}, []);

  return { onMouseDown, onMouseMove, onMouseUp };
};
