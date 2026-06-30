import { create } from "zustand";
import { temporal, type TemporalState } from "zundo";
import { useStoreWithEqualityFn } from "zustand/traditional";
import type { Shape, ShapeId, ShapePatch } from "@/core/drawing-engine/drawing.types";
import type { WallSplit } from "@/core/wall-junctions";
import type { SpaceAssignment, SpaceAssignments } from "@/core/spaces/spaceAssignment";
import { generateId } from "@/lib/generateId";
import { categoryOf } from "@/core/layers/systemCategories";

type ShapesMap = Record<ShapeId, Shape>;

/** A space surface that carries an assembly assignment. */
export type SpaceSurfaceKind = "floor" | "ceiling";

interface FloorPlanState {
  shapes: ShapesMap;
  /**
   * Per-space cost-assembly assignments, keyed by the space's stable id. This is
   * the ONLY space data in the document — geometry stays derived (computeSpaces)
   * and is never persisted. Inside the temporal wrapper, so picks are undoable.
   */
  spaceAssignments: SpaceAssignments;
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
  /**
   * Set (or clear, with `undefined`) one surface's assembly for a space. Touches
   * ONLY `spaceAssignments` — never `shapes` — so the geometry cache survives and
   * the room is not re-traced. Recorded in undo history.
   */
  setSpaceAssembly: (spaceId: string, surface: SpaceSurfaceKind, assemblyId: string | undefined) => void;
  /**
   * Set (or clear, with an empty/undefined value) a space's custom name. Like
   * {@link setSpaceAssembly} it touches ONLY `spaceAssignments`, never `shapes`,
   * so the geometry is not re-traced. Recorded in undo history.
   */
  setSpaceName: (spaceId: string, name: string | undefined) => void;
  /** Replace the space-assignment map — used when loading a page's document. */
  loadSpaceAssignments: (assignments: SpaceAssignments) => void;
  reset: () => void;
}

export type FloorPlanStore = FloorPlanState & FloorPlanActions;

export const useFloorPlanStore = create<FloorPlanStore>()(
  temporal(
    (set) => ({
      shapes: {},
      spaceAssignments: {},

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

      setSpaceAssembly: (spaceId, surface, assemblyId) =>
        set((s) => {
          const cur = s.spaceAssignments[spaceId];
          const next: SpaceAssignment = {
            floorAssemblyId: surface === "floor" ? assemblyId : cur?.floorAssemblyId,
            ceilingAssemblyId: surface === "ceiling" ? assemblyId : cur?.ceilingAssemblyId,
            name: cur?.name,
          };
          const map = { ...s.spaceAssignments };
          if (next.floorAssemblyId || next.ceilingAssemblyId || next.name) map[spaceId] = next;
          else delete map[spaceId]; // nothing left ⇒ drop the entry, keep the map minimal
          return { spaceAssignments: map };
        }),

      setSpaceName: (spaceId, name) =>
        set((s) => {
          const cur = s.spaceAssignments[spaceId];
          const next: SpaceAssignment = {
            floorAssemblyId: cur?.floorAssemblyId,
            ceilingAssemblyId: cur?.ceilingAssemblyId,
            name: name || undefined,
          };
          const map = { ...s.spaceAssignments };
          if (next.floorAssemblyId || next.ceilingAssemblyId || next.name) map[spaceId] = next;
          else delete map[spaceId]; // nothing left ⇒ drop the entry, keep the map minimal
          return { spaceAssignments: map };
        }),

      loadSpaceAssignments: (assignments) => set({ spaceAssignments: assignments }),

      reset: () => set({ shapes: {}, spaceAssignments: {} }),
    }),
    { limit: 100 },
  ),
);

export const useTemporalStore = <T>(
  selector: (state: TemporalState<FloorPlanState>) => T,
  equality?: (a: T, b: T) => boolean,
): T => useStoreWithEqualityFn(useFloorPlanStore.temporal, selector, equality);
