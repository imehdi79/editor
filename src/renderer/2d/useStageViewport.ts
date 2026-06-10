/**
 * useStageViewport — pan and pinch-zoom for the Konva Stage.
 *
 * Enabled only when no tool is active (tool === null).
 * When a drawing or selection tool is selected, all viewport interactions
 * are suppressed so tool drags are never misinterpreted as pans.
 *
 * --- Pan ---
 * Middle-mouse drag OR left-mouse drag when tool === null.
 * Updates Stage position directly via stageRef for zero-latency response,
 * then syncs to viewportStore on pointerup so other consumers stay in sync.
 *
 * --- Wheel zoom ---
 * Zooms centred on the cursor position so the point under the cursor stays
 * fixed. Uses the standard CAD formula:
 *   newX = pointerX - (pointerX - stage.x()) * factor
 *   newY = pointerY - (pointerY - stage.y()) * factor
 *
 * --- Pinch zoom (multi-touch) ---
 * Two-finger pinch. Centred on the midpoint between both touch points.
 * Stores the last pinch distance and midpoint to compute incremental scale.
 *
 * --- Coordinate transform ---
 * Exposes screenToWorld(sx, sy) so callers (useStageEvents) can convert
 * Konva getPointerPosition() results into world-space coordinates that are
 * invariant to pan and zoom.
 */

import { useCallback, useRef } from "react";
import type Konva from "konva";
import { useToolsStore } from "@/store/tools.store";
import { useViewportStore, MIN_SCALE, MAX_SCALE } from "@/store/viewport.store";

const ZOOM_FACTOR = 1.08; // per wheel tick — feels natural, not too fast
const ZOOM_FACTOR_TOUCH = 1;   // pinch uses raw ratio, not steps

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clampScale = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));

const getTouchMidpoint = (t1: Touch, t2: Touch) => ({
  x: (t1.clientX + t2.clientX) / 2,
  y: (t1.clientY + t2.clientY) / 2,
});

const getTouchDistance = (t1: Touch, t2: Touch) =>
  Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useStageViewport = (stageRef: React.RefObject<Konva.Stage>) => {
  const tool = useToolsStore((s) => s.tool);
  const setViewport = useViewportStore((s) => s.setViewport);

  // Pan state
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const stageStartPos = useRef({ x: 0, y: 0 });

  // Pinch state
  const lastPinchDist = useRef<number | null>(null);
  const lastPinchMid = useRef<{ x: number; y: number } | null>(null);

  // Sync current stage transform to the store (called on gesture end)
  const syncToStore = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    setViewport(stage.x(), stage.y(), stage.scaleX());
  }, [stageRef, setViewport]);

  // ---------------------------------------------------------------------------
  // World-space coordinate transform
  // screenToWorld converts Konva getPointerPosition() → world coordinates,
  // accounting for current stage pan (x, y) and zoom (scaleX).
  // ---------------------------------------------------------------------------
  const screenToWorld = useCallback(
    (sx: number, sy: number): { x: number; y: number } => {
      const stage = stageRef.current;
      if (!stage) return { x: sx, y: sy };
      const scale = stage.scaleX();
      return {
        x: (sx - stage.x()) / scale,
        y: (sy - stage.y()) / scale,
      };
    },
    [stageRef],
  );

  // ---------------------------------------------------------------------------
  // Wheel zoom — centred on cursor
  // ---------------------------------------------------------------------------
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      // Always prevent page scroll regardless of tool state
      e.evt.preventDefault();

      // Zoom blocked when a tool is active
      if (tool !== null) return;

      const stage = stageRef.current;
      if (!stage) return;

      const direction = e.evt.deltaY < 0 ? 1 : -1;
      const factor = direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      const oldScale = stage.scaleX();
      const newScale = clampScale(oldScale * factor);

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Keep the point under the cursor fixed in world space
      const newX = pointer.x - (pointer.x - stage.x()) * (newScale / oldScale);
      const newY = pointer.y - (pointer.y - stage.y()) * (newScale / oldScale);

      stage.scale({ x: newScale, y: newScale });
      stage.position({ x: newX, y: newY });
      stage.batchDraw();
      syncToStore();
    },
    [tool, stageRef, syncToStore],
  );

  // ---------------------------------------------------------------------------
  // Mouse pan — middle button always, left button when no tool
  // ---------------------------------------------------------------------------
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const isMiddle = e.evt.button === 1;
      const isLeftWithNoTool = e.evt.button === 0 && tool === null;
      if (!isMiddle && !isLeftWithNoTool) return;

      const stage = stageRef.current;
      if (!stage) return;

      isPanning.current = true;
      panStart.current = { x: e.evt.clientX, y: e.evt.clientY };
      stageStartPos.current = { x: stage.x(), y: stage.y() };

      // Change cursor to grabbing
      stage.container().style.cursor = "grabbing";
    },
    [tool, stageRef],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isPanning.current) return;

      const stage = stageRef.current;
      if (!stage) return;

      const dx = e.evt.clientX - panStart.current.x;
      const dy = e.evt.clientY - panStart.current.y;

      stage.position({
        x: stageStartPos.current.x + dx,
        y: stageStartPos.current.y + dy,
      });
      stage.batchDraw();
    },
    [stageRef],
  );

  const handleMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isPanning.current) return;
      isPanning.current = false;

      const stage = stageRef.current;
      if (stage) {
        // Restore cursor based on tool
        stage.container().style.cursor = tool === null ? "grab" : "";
        syncToStore();
      }
    },
    [stageRef, syncToStore, tool],
  );

  // Also handle mouseup on window in case pointer leaves stage while panning
  const handleMouseLeave = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      syncToStore();
    }
  }, [syncToStore]);

  // ---------------------------------------------------------------------------
  // Touch pinch zoom — two-finger gesture
  // ---------------------------------------------------------------------------
  const handleTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      if (tool !== null) return;
      const touches = e.evt.touches;
      if (touches.length !== 2) return;

      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const t1 = touches[0];
      const t2 = touches[1];
      const dist = getTouchDistance(t1, t2);
      const mid = getTouchMidpoint(t1, t2);

      // Get stage bounding rect to convert clientX/Y to stage-relative coords
      const rect = stage.container().getBoundingClientRect();
      const stageMidX = mid.x - rect.left;
      const stageMidY = mid.y - rect.top;

      if (lastPinchDist.current !== null && lastPinchMid.current !== null) {
        const ratio = dist / lastPinchDist.current;
        const oldScale = stage.scaleX();
        const newScale = clampScale(oldScale * ratio);

        // Zoom centred on pinch midpoint
        const newX = stageMidX - (stageMidX - stage.x()) * (newScale / oldScale);
        const newY = stageMidY - (stageMidY - stage.y()) * (newScale / oldScale);

        stage.scale({ x: newScale, y: newScale });
        stage.position({ x: newX, y: newY });
        stage.batchDraw();
      }

      lastPinchDist.current = dist;
      lastPinchMid.current = { x: stageMidX, y: stageMidY };
    },
    [tool, stageRef],
  );

  const handleTouchEnd = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      if (e.evt.touches.length < 2) {
        lastPinchDist.current = null;
        lastPinchMid.current = null;
        syncToStore();
      }
    },
    [syncToStore],
  );

  // ---------------------------------------------------------------------------
  // Cursor management when tool changes
  // ---------------------------------------------------------------------------
  const applyViewportCursor = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (tool === null) {
      stage.container().style.cursor = "grab";
    }
    // Tool-specific cursors are set by the existing TOOL_CURSORS mechanism
  }, [tool, stageRef]);

  return {
    screenToWorld,
    viewportEvents: {
      onWheel: handleWheel,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    applyViewportCursor,
    isPanning,
  };
};
