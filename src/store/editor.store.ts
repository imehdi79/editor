import { create } from "zustand";

interface EditorStore {
  viewMode: "2d" | "3d";
  snapGrid: number;
  axisAngleThreshold: number;
  snapRadius: number;

  setViewMode: (mode: "2d" | "3d") => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  viewMode: "2d",
  snapGrid: 0.5,
  axisAngleThreshold: 3, // degrees
  snapRadius: 15, // px

  setViewMode: (mode) => set({ viewMode: mode }),
}));
