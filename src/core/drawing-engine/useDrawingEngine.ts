import { useCallback, useRef, useState } from "react";
import { useEditorStore } from "@/store/editor.store";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { resolvePoint, type ResolveConfig } from "./resolvePoint";
import type { GhostShape, DrawingHints } from "./drawing.types";
import type { ToolDefinition } from "./tool-definition.types";

const EMPTY_HINTS: DrawingHints = {
  snapResult: null,
  guides: [],
  axisLocked: false,
  axisLockAngle: null,
  perpLocked: false,
  dimension: null,
};

export const useDrawingEngine = (toolDef: ToolDefinition | null) => {
  // --- store subscriptions ---
  const snapGrid = useEditorStore((s) => s.snapGrid);
  const axisAngleThreshold = useEditorStore((s) => s.axisAngleThreshold);
  const snapRadius = useEditorStore((s) => s.snapRadius);
  const dimensionUnit = useEditorStore((s) => s.dimensionUnit);
  const pixelsPerMeter = useEditorStore((s) => s.pixelsPerMeter);
  const shapes = useFloorPlanStore((s) => s.shapes);
  const addShape = useFloorPlanStore((s) => s.addShape);

  // --- local state ---
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [ghost, setGhost] = useState<GhostShape>(null);
  const [hints, setHints] = useState<DrawingHints>(EMPTY_HINTS);

  /**
   * Build the ResolveConfig from current store values.
   * Inlined as a helper so the config object is always fresh inside each
   * callback without adding it to the dep arrays (same values are already
   * captured via the individual store subscriptions above).
   */
  const makeConfig = useCallback(
    (): ResolveConfig => ({
      snapGrid,
      axisAngleThreshold,
      snapRadius,
      dimensionUnit,
      pixelsPerMeter,
      shapes,
    }),
    [snapGrid, axisAngleThreshold, snapRadius, dimensionUnit, pixelsPerMeter, shapes],
  );

  const onMouseDown = useCallback(
    (rawX: number, rawY: number) => {
      if (!toolDef) return;
      const { x, y } = resolvePoint(rawX, rawY, makeConfig());
      startRef.current = { x, y };
      setGhost(toolDef.buildGhost(x, y, x, y));
      setHints(EMPTY_HINTS);
    },
    [toolDef, makeConfig],
  );

  const onMouseMove = useCallback(
    (rawX: number, rawY: number) => {
      if (!toolDef) return;
      const start = startRef.current;
      const { x, y, pointSnap, guides, axisLocked, axisLockAngle, perpLocked, dimension } = resolvePoint(
        rawX,
        rawY,
        makeConfig(),
        start?.x,
        start?.y,
      );

      if (start) {
        setGhost(toolDef.buildGhost(start.x, start.y, x, y));
      }

      setHints({
        snapResult: pointSnap.snapped ? pointSnap : null,
        guides,
        axisLocked,
        axisLockAngle,
        perpLocked,
        dimension,
      });
    },
    [toolDef, makeConfig],
  );

  const onMouseUp = useCallback(
    (rawX: number, rawY: number) => {
      if (!toolDef || !startRef.current) return;
      const start = startRef.current;
      const { x, y } = resolvePoint(rawX, rawY, makeConfig(), start.x, start.y);
      const dist = Math.hypot(x - start.x, y - start.y);

      if (dist >= (toolDef.minLength ?? 5)) {
        addShape(toolDef.buildShape(start.x, start.y, x, y));
      }

      startRef.current = null;
      setGhost(null);
      setHints(EMPTY_HINTS);
    },
    [toolDef, makeConfig, addShape],
  );

  return { ghost, hints, onMouseDown, onMouseMove, onMouseUp };
};
