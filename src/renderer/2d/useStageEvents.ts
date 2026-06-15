/**
 * useStageEvents — bridges raw Konva pointer events to the drawing/selection
 * engine callbacks, converting screen coordinates to world coordinates.
 *
 * screenToWorld is provided by useStageViewport and applies the inverse of the
 * current pan + zoom transform. This ensures that snapping, hit-testing, and
 * shape placement all work correctly regardless of viewport state.
 *
 * Two-finger touches are routed to the viewport pan/zoom system (useStageViewport),
 * not to the drawing engine. Single-touch events are forwarded as usual.
 */

import { useCallback, useRef } from "react";
import type Konva from "konva";

interface StageHandlers {
  onMouseDown: (x: number, y: number) => void;
  onMouseMove: (x: number, y: number) => void;
  onMouseUp: (x: number, y: number) => void;
  /** Abort an in-progress tool gesture (e.g. a second finger began a pinch). */
  onCancel: () => void;
  /** Converts Konva screen-space pointer coords to world space */
  screenToWorld: (sx: number, sy: number) => { x: number; y: number };
}

const isSingleTouch = (e: Konva.KonvaEventObject<TouchEvent>) => e.evt.touches.length === 1;

const getScreenPos = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) =>
  e.target.getStage()?.getPointerPosition() ?? null;

export const useStageEvents = ({ onMouseDown, onMouseMove, onMouseUp, onCancel, screenToWorld }: StageHandlers) => {
  /**
   * A second finger turns the gesture into a pinch/zoom. Once set, this stays
   * true until ALL fingers lift (touches === 0) — not just when the count drops
   * back to 1 — so the staggered touchend of a two-finger gesture can never be
   * mistaken for a tool tap/commit.
   */
  const multiTouch = useRef(false);

  // ---------------------------------------------------------------------------
  // Mouse — convert to world space before forwarding
  // ---------------------------------------------------------------------------
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Middle-mouse and no-tool pans are handled by useStageViewport
      if (e.evt.button !== 0) return;
      const pos = getScreenPos(e);
      if (pos) {
        const world = screenToWorld(pos.x, pos.y);
        onMouseDown(world.x, world.y);
      }
    },
    [onMouseDown, screenToWorld],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = getScreenPos(e);
      if (pos) {
        const world = screenToWorld(pos.x, pos.y);
        onMouseMove(world.x, world.y);
      }
    },
    [onMouseMove, screenToWorld],
  );

  const handleMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button !== 0) return;
      const pos = getScreenPos(e);
      if (pos) {
        const world = screenToWorld(pos.x, pos.y);
        onMouseUp(world.x, world.y);
      }
    },
    [onMouseUp, screenToWorld],
  );

  // ---------------------------------------------------------------------------
  // Touch — single-touch forwards to engine; multi-touch → viewport
  // ---------------------------------------------------------------------------
  const handleTouchStart = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      if (!isSingleTouch(e)) {
        // A second finger arrived → this is a pinch. Cancel any tool gesture the
        // first finger started so it never turns into an accidental shape.
        if (!multiTouch.current) onCancel();
        multiTouch.current = true;
        return;
      }
      multiTouch.current = false;
      e.evt.preventDefault();
      const pos = getScreenPos(e);
      if (pos) {
        const world = screenToWorld(pos.x, pos.y);
        onMouseDown(world.x, world.y);
      }
    },
    [onMouseDown, onCancel, screenToWorld],
  );

  const handleTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      if (multiTouch.current || !isSingleTouch(e)) return;
      e.evt.preventDefault();
      const pos = getScreenPos(e);
      if (pos) {
        const world = screenToWorld(pos.x, pos.y);
        onMouseMove(world.x, world.y);
      }
    },
    [onMouseMove, screenToWorld],
  );

  const handleTouchEnd = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      if (multiTouch.current) {
        // Stay suppressed until every finger is up; never commit a tool gesture
        // as part of ending a pinch.
        if (e.evt.touches.length === 0) multiTouch.current = false;
        return;
      }
      e.evt.preventDefault();
      const pos = getScreenPos(e);
      if (pos) {
        const world = screenToWorld(pos.x, pos.y);
        onMouseUp(world.x, world.y);
      }
    },
    [onMouseUp, screenToWorld],
  );

  return {
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};
