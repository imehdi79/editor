/**
 * viewportStore — pan and zoom state for the 2D canvas.
 *
 * Kept separate from editorStore because viewport is a pure UI/navigation
 * concern and may be reset without affecting drawing state.
 *
 * x, y  — stage translation in screen pixels (Konva Stage.x / Stage.y)
 * scale — uniform zoom factor (Konva Stage.scaleX = Stage.scaleY)
 */

import { create } from "zustand";

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 20;

interface ViewportStore {
  x: number;
  y: number;
  scale: number;
  setViewport: (x: number, y: number, scale: number) => void;
  resetViewport: () => void;
}

export const useViewportStore = create<ViewportStore>((set) => ({
  x: 0,
  y: 0,
  scale: 1,
  setViewport: (x, y, scale) => set({ x, y, scale }),
  resetViewport: () => set({ x: 0, y: 0, scale: 1 }),
}));
