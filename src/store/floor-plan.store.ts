import { create } from "zustand";
import { temporal, type TemporalState } from "zundo";
import { useStoreWithEqualityFn } from "zustand/traditional";
import type { Shape, ShapeId } from "@/core/drawing-engine/drawing.types";
import { generateId } from "@/lib/generateId";

type ShapesMap = Record<ShapeId, Shape>;

interface FloorPlanState {
  shapes: ShapesMap;
}

interface FloorPlanActions {
  addShape: (shape: Omit<Shape, "id">) => void;
  removeShape: (id: ShapeId) => void;
  /** Commit a transform (move / resize / rotate) — recorded in undo history. */
  updateShape: (id: ShapeId, patch: Partial<Omit<Shape, "id" | "type">>) => void;
  reset: () => void;
}

export type FloorPlanStore = FloorPlanState & FloorPlanActions;

export const useFloorPlanStore = create<FloorPlanStore>()(
  temporal(
    (set) => ({
      shapes: {},

      addShape: (shape) => {
        const id = generateId(shape.type);
        const full = { ...shape, id } as Shape;
        set((s) => ({ shapes: { ...s.shapes, [id]: full } }));
      },

      removeShape: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.shapes;
          return { shapes: rest };
        }),

      updateShape: (id, patch) =>
        set((s) => {
          const shape = s.shapes[id];
          if (!shape) return s;
          return { shapes: { ...s.shapes, [id]: { ...shape, ...patch } as Shape } };
        }),

      reset: () => set({ shapes: {} }),
    }),
    { limit: 100 },
  ),
);

export const useTemporalStore = <T>(
  selector: (state: TemporalState<FloorPlanState>) => T,
  equality?: (a: T, b: T) => boolean,
): T => useStoreWithEqualityFn(useFloorPlanStore.temporal, selector, equality);
