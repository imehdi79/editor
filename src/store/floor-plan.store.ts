import { create } from "zustand";
import { temporal, type TemporalState } from "zundo";
import { useStoreWithEqualityFn } from "zustand/traditional";
import type { Shape, ShapeId } from "@/core/drawing-engine/drawing.types";
import { generateId } from "@/lib/generateId";

type ShapesMap = Record<ShapeId, Shape>;

// ---------------------------------------------------------------------------
// Floor-plan store — shapes only, wrapped with temporal for undo/redo
//
// `selectedId` intentionally lives in a separate store (selection.store.ts)
// so that selection changes never touch this store's `set` and never create
// spurious undo/redo entries.
// ---------------------------------------------------------------------------

interface FloorPlanState {
  shapes: ShapesMap;
}

interface FloorPlanActions {
  addShape: (shape: Omit<Shape, "id">) => void;
  removeShape: (id: ShapeId) => void;
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

      reset: () => set({ shapes: {} }),
    }),
    { limit: 100 },
  ),
);

// ---------------------------------------------------------------------------
// Reactive hook for undo/redo consumers
// ---------------------------------------------------------------------------

export const useTemporalStore = <T>(
  selector: (state: TemporalState<FloorPlanState>) => T,
  equality?: (a: T, b: T) => boolean,
): T => useStoreWithEqualityFn(useFloorPlanStore.temporal, selector, equality);
