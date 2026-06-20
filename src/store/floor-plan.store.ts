import { create } from "zustand";
import { temporal, type TemporalState } from "zundo";
import { useStoreWithEqualityFn } from "zustand/traditional";
import type { Shape, ShapeId, ShapePatch } from "@/core/drawing-engine/drawing.types";
import type { WallSplit } from "@/core/wall-junctions";
import { generateId } from "@/lib/generateId";
import { categoryOf } from "@/core/layers/systemCategories";

type ShapesMap = Record<ShapeId, Shape>;

interface FloorPlanState {
  shapes: ShapesMap;
}

interface FloorPlanActions {
  addShape: (shape: Omit<Shape, "id">) => void;
  /**
   * Add a wall while splitting any hosts it lands on mid-span, in ONE undo step.
   * Each split host is removed and replaced by its two halves; the new wall and
   * all halves are added together so undo restores the host atomically.
   */
  addShapeWithSplits: (shape: Omit<Shape, "id">, splits: WallSplit[]) => void;
  removeShape: (id: ShapeId) => void;
  /** Commit a transform (move / resize / rotate) — recorded in undo history. */
  updateShape: (id: ShapeId, patch: ShapePatch) => void;
  /** Replace the entire shapes map — used when loading a page's document. */
  loadShapes: (shapes: ShapesMap) => void;
  reset: () => void;
}

export type FloorPlanStore = FloorPlanState & FloorPlanActions;

export const useFloorPlanStore = create<FloorPlanStore>()(
  temporal(
    (set) => ({
      shapes: {},

      addShape: (shape) => {
        const id = generateId(shape.type);
        // Stamp the system category (explicit one wins, else default-for-type)
        // so layer visibility works and the assignment persists with the doc.
        const full = { ...shape, id, category: categoryOf(shape) } as Shape;
        set((s) => ({ shapes: { ...s.shapes, [id]: full } }));
      },

      addShapeWithSplits: (shape, splits) =>
        set((s) => {
          const next: ShapesMap = { ...s.shapes };
          for (const split of splits) {
            delete next[split.hostId];
            for (const part of split.parts) {
              const pid = generateId(part.type);
              next[pid] = { ...part, id: pid, category: categoryOf(part) } as Shape;
            }
          }
          const id = generateId(shape.type);
          next[id] = { ...shape, id, category: categoryOf(shape) } as Shape;
          return { shapes: next };
        }),

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

      loadShapes: (shapes) => set({ shapes }),

      reset: () => set({ shapes: {} }),
    }),
    { limit: 100 },
  ),
);

export const useTemporalStore = <T>(
  selector: (state: TemporalState<FloorPlanState>) => T,
  equality?: (a: T, b: T) => boolean,
): T => useStoreWithEqualityFn(useFloorPlanStore.temporal, selector, equality);
