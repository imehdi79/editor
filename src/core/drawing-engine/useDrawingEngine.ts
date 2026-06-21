import { useCallback, useRef, useState } from "react";
import { useEditorStore } from "@/store/editor.store";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { resolvePoint, type ResolveConfig } from "./resolvePoint";
import { resolveMidSpanSplits } from "@/core/wall-junctions";
import type { GhostShape, DrawingHints } from "./drawing.types";
import type { ToolDefinition } from "./tool-definition.types";
import type { WallShape } from "./drawing.types";

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
  const guideThreshold = useEditorStore((s) => s.guideThreshold);
  const perpThreshold = useEditorStore((s) => s.perpThreshold);
  const dimensionUnit = useEditorStore((s) => s.dimensionUnit);
  const pixelsPerMeter = useEditorStore((s) => s.pixelsPerMeter);
  const shapes = useFloorPlanStore((s) => s.shapes);
  const addShape = useFloorPlanStore((s) => s.addShape);
  const addShapeWithSplits = useFloorPlanStore((s) => s.addShapeWithSplits);

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
      guideThreshold,
      perpThreshold,
      dimensionUnit,
      pixelsPerMeter,
      shapes,
    }),
    [snapGrid, axisAngleThreshold, snapRadius, guideThreshold, perpThreshold, dimensionUnit, pixelsPerMeter, shapes],
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
        const shape = toolDef.buildShape(start.x, start.y, x, y);
        // A new wall whose endpoint lands mid-span on an existing wall splits
        // that host into a real T (one atomic undo step).
        if (shape.type === "wall") {
          const { wall, splits } = resolveMidSpanSplits(shape as Omit<WallShape, "id">, shapes);
          if (splits.length > 0) addShapeWithSplits(wall, splits);
          else addShape(wall);
        } else {
          addShape(shape);
        }
      }

      startRef.current = null;
      setGhost(null);
      setHints(EMPTY_HINTS);
    },
    [toolDef, makeConfig, addShape, addShapeWithSplits, shapes],
  );

  /** Abort an in-progress draw without committing (e.g. a pinch-zoom began). */
  const cancel = useCallback(() => {
    startRef.current = null;
    setGhost(null);
    setHints(EMPTY_HINTS);
  }, []);

  return { ghost, hints, onMouseDown, onMouseMove, onMouseUp, cancel };
};
