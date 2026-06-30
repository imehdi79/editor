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

const getScreenPos = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) =>
  e.target.getStage()?.getPointerPosition() ?? null;

/** px change in the two-finger distance that classifies a touch pair as a real
 *  pinch (rather than a resting palm / stray second touch). */
const PINCH_MOVE_THRESHOLD = 12;

const touchById = (touches: TouchList, id: number): Touch | null => {
  for (let i = 0; i < touches.length; i++) if (touches[i].identifier === id) return touches[i];
  return null;
};

const twoTouchDist = (touches: TouchList) =>
  Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

/** A specific touch's position relative to the stage container (screen space). */
const touchStagePos = (e: Konva.KonvaEventObject<TouchEvent>, touch: Touch) => {
  const stage = e.target.getStage();
  if (!stage) return null;
  const rect = stage.container().getBoundingClientRect();
  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
};

export const useStageEvents = ({ onMouseDown, onMouseMove, onMouseUp, onCancel, screenToWorld }: StageHandlers) => {
  /**
   * Pointer-identifier capture for touch. The tool gesture is owned by the FIRST
   * finger (`primaryId`) and follows only that pointer, so extra touches don't
   * disturb it. A second touch counts as a real pinch only once the two fingers'
   * distance actually changes (`pinchSeen`) — a resting palm / stray tap that
   * never pinches is tolerated and the stroke still commits. The commit-vs-cancel
   * decision is deferred to all-fingers-up so a brief multi-touch never aborts a
   * deliberate stroke. (The viewport's own pinch-zoom path is independent.)
   */
  const primaryId = useRef<number | null>(null);
  const pinchSeen = useRef(false);
  const pinchStartDist = useRef<number | null>(null);
  const lastWorld = useRef<{ x: number; y: number } | null>(null);

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
      const touches = e.evt.touches;
      if (touches.length >= 2) {
        // A second finger joined — record the baseline two-finger distance so a
        // true pinch can be told apart from a resting palm. Don't cancel yet.
        if (touches.length === 2) pinchStartDist.current = twoTouchDist(touches);
        else pinchSeen.current = true; // 3+ fingers ⇒ definitely not a stroke
        return;
      }
      // First finger — it owns the tool gesture.
      const t = e.evt.changedTouches[0];
      primaryId.current = t.identifier;
      pinchSeen.current = false;
      pinchStartDist.current = null;
      e.evt.preventDefault();
      const pos = touchStagePos(e, t);
      if (pos) {
        const world = screenToWorld(pos.x, pos.y);
        lastWorld.current = world;
        onMouseDown(world.x, world.y);
      }
    },
    [onMouseDown, screenToWorld],
  );

  const handleTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      if (touches.length >= 2) {
        // Multi-touch: a real pinch is a change in the two-finger distance. Tool
        // moves are suppressed while >1 finger is down (the viewport pinches).
        if (touches.length === 2 && pinchStartDist.current !== null) {
          if (Math.abs(twoTouchDist(touches) - pinchStartDist.current) > PINCH_MOVE_THRESHOLD) {
            pinchSeen.current = true;
          }
        }
        return;
      }
      if (primaryId.current === null) return;
      const t = touchById(touches, primaryId.current);
      if (!t) return; // the lone finger down isn't the primary (e.g. a lingering palm)
      e.evt.preventDefault();
      const pos = touchStagePos(e, t);
      if (pos) {
        const world = screenToWorld(pos.x, pos.y);
        lastWorld.current = world;
        onMouseMove(world.x, world.y);
      }
    },
    [onMouseMove, screenToWorld],
  );

  const handleTouchEnd = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      // Reset the pinch baseline whenever we drop below two fingers.
      if (e.evt.touches.length < 2) pinchStartDist.current = null;
      // Resolve only once EVERY finger is up, so a staggered multi-touch release
      // never commits or double-fires.
      if (e.evt.touches.length > 0) return;

      const hadGesture = primaryId.current !== null;
      const wasPinch = pinchSeen.current;
      const world = lastWorld.current;
      primaryId.current = null;
      pinchSeen.current = false;
      lastWorld.current = null;
      if (!hadGesture) return; // pinch-only — no tool gesture to resolve

      e.evt.preventDefault();
      if (wasPinch) {
        // A real pinch happened during the gesture — drop it, never commit an
        // accidental shape.
        onCancel();
      } else if (world) {
        // Stray / resting extra touches were tolerated — commit at the primary
        // finger's last position.
        onMouseUp(world.x, world.y);
      }
    },
    [onMouseUp, onCancel],
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
