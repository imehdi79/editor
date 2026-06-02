import { useCallback, useRef, useState } from "react";
import { useEditorStore } from "@/store/editor.store";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { snapPointToGrid } from "@/core/snapping/snapToGrid";
import { snapToPoints } from "@/core/snapping/snapToPoints";
import { applyAxisLock } from "@/core/snapping/axisLock";
import { computeAlignmentGuides } from "@/core/guides/alignmentGuides";
import type { GhostShape, DrawingHints, SnapResult } from "./drawing.types";
import type { ToolDefinition } from "./tool-definition.types";

const EMPTY_HINTS: DrawingHints = {
  snapResult: null,
  guides: [],
  axisLocked: false,
  axisLockAngle: null,
};

export const useDrawingEngine = (toolDef: ToolDefinition | null) => {
  const snapGrid = useEditorStore((s) => s.snapGrid);
  const axisAngleThreshold = useEditorStore((s) => s.axisAngleThreshold);
  const snapRadius = useEditorStore((s) => s.snapRadius);
  const shapes = useFloorPlanStore((s) => s.shapes);
  const addShape = useFloorPlanStore((s) => s.addShape);

  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [ghost, setGhost] = useState<GhostShape>(null);
  const [hints, setHints] = useState<DrawingHints>(EMPTY_HINTS);

  // pipeline: grid → point snap → axis lock → guides
  const resolve = useCallback(
    (rawX: number, rawY: number, startX?: number, startY?: number) => {
      // 1. grid snap
      const gridSnapped = snapPointToGrid(rawX, rawY, snapGrid);

      // 2. snap به نزدیک‌ترین نقطه (node، midpoint، intersection)
      const pointSnap: SnapResult = snapToPoints(gridSnapped.x, gridSnapped.y, shapes, 1, snapRadius);
      let { x, y } = pointSnap;

      // 3. axis lock — فقط در حین drag (وقتی start داریم)
      let axisLocked = false;
      let axisLockAngle: DrawingHints["axisLockAngle"] = null;

      if (startX !== undefined && startY !== undefined && !pointSnap.snapped) {
        // اگه به نقطه snap نشدیم، axis lock چک کن
        const locked = applyAxisLock(startX, startY, x, y, axisAngleThreshold);
        if (locked.locked) {
          x = locked.x;
          y = locked.y;
          axisLocked = true;
          axisLockAngle = locked.axis;
        }
      }

      // 4. alignment guides از coordinate نهایی
      const { guides, snappedX, snappedY } = computeAlignmentGuides(x, y, shapes);

      // اگه guide snap داشت و هنوز point snap نشدیم، اعمال کن
      if (!pointSnap.snapped && !axisLocked) {
        if (snappedX !== null) x = snappedX;
        if (snappedY !== null) y = snappedY;
      }

      return { x, y, pointSnap, guides, axisLocked, axisLockAngle };
    },
    [snapGrid, shapes, snapRadius, axisAngleThreshold],
  );

  const onMouseDown = useCallback(
    (rawX: number, rawY: number) => {
      if (!toolDef) return;
      const { x, y } = resolve(rawX, rawY);
      startRef.current = { x, y };
      setGhost(toolDef.buildGhost(x, y, x, y));
      setHints(EMPTY_HINTS);
    },
    [toolDef, resolve],
  );

  const onMouseMove = useCallback(
    (rawX: number, rawY: number) => {
      if (!toolDef) return;
      const start = startRef.current;

      const { x, y, pointSnap, guides, axisLocked, axisLockAngle } = resolve(rawX, rawY, start?.x, start?.y);

      if (start) {
        setGhost(toolDef.buildGhost(start.x, start.y, x, y));
      }

      setHints({
        snapResult: pointSnap.snapped ? pointSnap : null,
        guides,
        axisLocked,
        axisLockAngle,
      });
    },
    [toolDef, resolve],
  );

  const onMouseUp = useCallback(
    (rawX: number, rawY: number) => {
      if (!toolDef || !startRef.current) return;
      const start = startRef.current;

      const { x, y } = resolve(rawX, rawY, start.x, start.y);
      const dist = Math.hypot(x - start.x, y - start.y);

      if (dist >= (toolDef.minLength ?? 5)) {
        addShape(toolDef.buildShape(start.x, start.y, x, y));
      }

      startRef.current = null;
      setGhost(null);
      setHints(EMPTY_HINTS);
    },
    [toolDef, resolve, addShape],
  );

  return { ghost, hints, onMouseDown, onMouseMove, onMouseUp };
};
