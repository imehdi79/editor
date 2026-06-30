/**
 * useCanvasGestures — touch double-tap + long-press detection for the canvas.
 *
 * A thin observer layered alongside the viewport and tool event handlers: it
 * times single-finger presses/taps and fires `onDoubleTap` / `onLongPress`
 * without consuming the underlying events, so the existing tap/drag/pinch
 * routing and the second-finger cancel are untouched. A second finger or any
 * real travel cancels the in-progress gesture. Inert when `enabled` is false
 * (e.g. while a drawing tool is active, so chain taps are never hijacked).
 */

import { useCallback, useEffect, useRef } from "react";
import type Konva from "konva";

const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DIST = 30; // screen px allowed between the two taps
const LONG_PRESS_MS = 500;
const MOVE_CANCEL = 10; // screen px of travel that turns a press into a drag

interface Options {
  /** Gate (e.g. only in select / pan mode). Disabled ⇒ no gestures fire. */
  enabled: boolean;
  onDoubleTap: () => void;
  onLongPress: () => void;
}

type TE = Konva.KonvaEventObject<TouchEvent>;

export const useCanvasGestures = ({ enabled, onDoubleTap, onLongPress }: Options) => {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTap = useRef<{ x: number; y: number; t: number } | null>(null);
  const timer = useRef<number | null>(null);
  const longFired = useRef(false);

  const clearTimer = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const onTouchStart = useCallback(
    (e: TE) => {
      clearTimer();
      start.current = null;
      longFired.current = false;
      if (!enabled || e.evt.touches.length !== 1) return; // multi-touch ⇒ pinch
      const t = e.evt.touches[0];
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
      timer.current = window.setTimeout(() => {
        longFired.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    [enabled, onLongPress],
  );

  const onTouchMove = useCallback((e: TE) => {
    const s = start.current;
    const t = e.evt.touches[0];
    if (!s || !t) return;
    if (Math.hypot(t.clientX - s.x, t.clientY - s.y) > MOVE_CANCEL) {
      clearTimer();
      start.current = null; // travelled ⇒ a drag, not a tap / long-press
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: TE) => {
      clearTimer();
      const s = start.current;
      start.current = null;
      if (!enabled || !s || longFired.current) return; // inert / already consumed
      if (e.evt.touches.length !== 0) return; // other fingers down ⇒ not a clean tap
      if (Date.now() - s.t > LONG_PRESS_MS) return; // held too long to be a tap
      const now = Date.now();
      const prev = lastTap.current;
      if (prev && now - prev.t < DOUBLE_TAP_MS && Math.hypot(s.x - prev.x, s.y - prev.y) < DOUBLE_TAP_DIST) {
        lastTap.current = null;
        onDoubleTap();
      } else {
        lastTap.current = { x: s.x, y: s.y, t: now };
      }
    },
    [enabled, onDoubleTap],
  );

  return { onTouchStart, onTouchMove, onTouchEnd };
};
