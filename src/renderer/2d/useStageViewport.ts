import { useCallback, useRef } from "react";
import type Konva from "konva";
import { useToolsStore } from "@/store/tools.store";
import { useViewportStore, MIN_SCALE, MAX_SCALE } from "@/store/viewport.store";

const ZOOM_FACTOR = 1.08;

const clampScale = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
const getTouchMidpoint = (t1: Touch, t2: Touch) => ({
  x: (t1.clientX + t2.clientX) / 2,
  y: (t1.clientY + t2.clientY) / 2,
});
const getTouchDistance = (t1: Touch, t2: Touch) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

/**
 * @param shouldPanAtWorld  For the merged select+pan tool: returns true when a
 *   single-pointer drag starting at this world point should pan (i.e. nothing
 *   selectable is under the pointer). Omitted/false ⇒ that gesture goes to the
 *   active tool instead. Ignored when no tool is selected (always pans).
 */
export const useStageViewport = (
  stageRef: React.RefObject<Konva.Stage>,
  shouldPanAtWorld?: (worldX: number, worldY: number) => boolean,
) => {
  const tool = useToolsStore((s) => s.tool);
  const setViewport = useViewportStore((s) => s.setViewport);

  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const stageStartPos = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const lastPinchMid = useRef<{ x: number; y: number } | null>(null);

  /** pan-only mode = no tool selected (single pointer always pans) */
  const isPanMode = tool === null;

  const syncToStore = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    setViewport(stage.x(), stage.y(), stage.scaleX());
  }, [stageRef, setViewport]);

  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const stage = stageRef.current;
      if (!stage) return { x: sx, y: sy };
      const scale = stage.scaleX();
      return { x: (sx - stage.x()) / scale, y: (sy - stage.y()) / scale };
    },
    [stageRef],
  );

  /** Should a single-pointer drag from this *screen* point start a pan? */
  const allowSinglePan = useCallback(
    (screenX: number, screenY: number): boolean => {
      if (isPanMode) return true; // no tool — always pan
      if (!shouldPanAtWorld) return false; // drawing tools never single-pan
      const w = screenToWorld(screenX, screenY);
      return shouldPanAtWorld(w.x, w.y);
    },
    [isPanMode, shouldPanAtWorld, screenToWorld],
  );

  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      isPanning.current = true;
      panStart.current = { x: clientX, y: clientY };
      stageStartPos.current = { x: stage.x(), y: stage.y() };
      stage.container().style.cursor = "grabbing";
    },
    [stageRef],
  );

  const movePan = useCallback(
    (clientX: number, clientY: number) => {
      if (!isPanning.current) return;
      const stage = stageRef.current;
      if (!stage) return;
      stage.position({
        x: stageStartPos.current.x + clientX - panStart.current.x,
        y: stageStartPos.current.y + clientY - panStart.current.y,
      });
      stage.batchDraw();
    },
    [stageRef],
  );

  const endPan = useCallback(() => {
    if (!isPanning.current) return;
    isPanning.current = false;
    const stage = stageRef.current;
    if (stage) {
      stage.container().style.cursor = isPanMode ? "grab" : "";
      syncToStore();
    }
  }, [stageRef, syncToStore, isPanMode]);

  // Mouse
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Middle button always pans.
      if (e.evt.button === 1) {
        startPan(e.evt.clientX, e.evt.clientY);
        return;
      }
      // Left button pans only on empty space (merged tool) or in pan-only mode.
      if (e.evt.button !== 0) return;
      const pos = stageRef.current?.getPointerPosition();
      if (pos && allowSinglePan(pos.x, pos.y)) startPan(e.evt.clientX, e.evt.clientY);
    },
    [allowSinglePan, startPan, stageRef],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      movePan(e.evt.clientX, e.evt.clientY);
    },
    [movePan],
  );

  const handleMouseUp = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      endPan();
    },
    [endPan],
  );

  const handleMouseLeave = useCallback(() => {
    if (isPanning.current) endPan();
  }, [endPan]);

  // Wheel zoom — always active
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const factor = e.evt.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      const oldScale = stage.scaleX();
      const newScale = clampScale(oldScale * factor);
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      stage.scale({ x: newScale, y: newScale });
      stage.position({
        x: pointer.x - (pointer.x - stage.x()) * (newScale / oldScale),
        y: pointer.y - (pointer.y - stage.y()) * (newScale / oldScale),
      });
      stage.batchDraw();
      syncToStore();
    },
    [stageRef, syncToStore],
  );

  // Touch — single touch pans on empty space (or in pan-only mode); two fingers
  // always pinch-zoom.
  const handleTouchStart = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      if (e.evt.touches.length !== 1) return;
      const stage = stageRef.current;
      if (!stage) return;
      const t = e.evt.touches[0];
      const rect = stage.container().getBoundingClientRect();
      if (allowSinglePan(t.clientX - rect.left, t.clientY - rect.top)) {
        e.evt.preventDefault();
        startPan(t.clientX, t.clientY);
      }
    },
    [allowSinglePan, startPan, stageRef],
  );

  const handleTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      if (touches.length === 2) {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
        const dist = getTouchDistance(touches[0], touches[1]);
        const mid = getTouchMidpoint(touches[0], touches[1]);
        const rect = stage.container().getBoundingClientRect();
        const sx = mid.x - rect.left;
        const sy = mid.y - rect.top;
        if (lastPinchDist.current !== null) {
          const ratio = dist / lastPinchDist.current;
          const oldScale = stage.scaleX();
          const newScale = clampScale(oldScale * ratio);
          stage.scale({ x: newScale, y: newScale });
          stage.position({
            x: sx - (sx - stage.x()) * (newScale / oldScale),
            y: sy - (sy - stage.y()) * (newScale / oldScale),
          });
          stage.batchDraw();
        }
        lastPinchDist.current = dist;
        lastPinchMid.current = { x: sx, y: sy };
        // Stop single-touch pan if it was running
        isPanning.current = false;
      } else if (touches.length === 1 && isPanning.current) {
        e.evt.preventDefault();
        movePan(touches[0].clientX, touches[0].clientY);
      }
    },
    [stageRef, movePan],
  );

  const handleTouchEnd = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      if (e.evt.touches.length < 2) {
        lastPinchDist.current = null;
        lastPinchMid.current = null;
        syncToStore();
      }
      if (e.evt.touches.length === 0) endPan();
    },
    [syncToStore, endPan],
  );

  return {
    screenToWorld,
    isPanning,
    viewportEvents: {
      onWheel: handleWheel,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
};
