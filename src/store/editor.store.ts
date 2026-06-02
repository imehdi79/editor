import { create } from "zustand";

interface EditorStore {
  viewMode: "2d" | "3d";
  snapGrid: number;
  axisLockThreshold: number;

  setViewMode: (mode: "2d" | "3d") => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  viewMode: "2d",
  snapGrid: 0.5,
  axisLockThreshold: 25,

  setViewMode: (mode) => set({ viewMode: mode }),
}));
