/**
 * pointer.store — the canvas pointer's current world coordinates (px).
 *
 * Written by the 2D stage on mouse move and read by the status bar's coordinate
 * readout. Kept independent of viewport/floor-plan stores so updating it never
 * triggers a derived recompute (rooms/dimensions/topology) — only the status bar
 * subscribes.
 */

import { create } from "zustand";

interface PointerStore {
  /** World-space pointer position, or null when off-canvas. */
  world: { x: number; y: number } | null;
  setWorld: (world: { x: number; y: number } | null) => void;
}

export const usePointerStore = create<PointerStore>((set) => ({
  world: null,
  setWorld: (world) => set({ world }),
}));
