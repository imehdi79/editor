import { create } from "zustand";

export type DimensionUnit = "px" | "cm" | "m";

interface EditorStore {
  viewMode: "2d" | "3d";
  snapGrid: number;
  axisAngleThreshold: number;
  snapRadius: number;
  dimensionUnit: DimensionUnit;
  pixelsPerMeter: number;

  setViewMode: (mode: "2d" | "3d") => void;
  setDimensionUnit: (unit: DimensionUnit) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  viewMode: "2d",
  snapGrid: 0.5,
  axisAngleThreshold: 3,
  snapRadius: window.matchMedia("(pointer: coarse)").matches ? 28 : 12,
  dimensionUnit: "cm",
  pixelsPerMeter: 100,

  setViewMode: (mode) => set({ viewMode: mode }),
  setDimensionUnit: (unit) => set({ dimensionUnit: unit }),
}));
