/**
 * useViewportZoom — zoom + fit helpers that operate about the screen centre.
 *
 * Shared by the desktop ViewControls and the mobile zoom cluster so the two
 * behave identically. Pure navigation over the viewport store; pinch-zoom (in
 * useStageViewport) remains the primary touch gesture — these are the button
 * affordances (step zoom + reset/fit).
 */

import { useViewportStore, MIN_SCALE, MAX_SCALE } from "@/store/viewport.store";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const useViewportZoom = () => {
  const x = useViewportStore((s) => s.x);
  const y = useViewportStore((s) => s.y);
  const scale = useViewportStore((s) => s.scale);
  const setViewport = useViewportStore((s) => s.setViewport);
  const resetViewport = useViewportStore((s) => s.resetViewport);

  /** Multiply the zoom by `factor`, keeping the screen centre fixed. */
  const zoomBy = (factor: number) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const next = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
    const wx = (cx - x) / scale;
    const wy = (cy - y) / scale;
    setViewport(cx - wx * next, cy - wy * next, next);
  };

  return { zoomBy, fit: resetViewport };
};
