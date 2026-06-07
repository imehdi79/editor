/**
 * selection.store — ephemeral UI selection state.
 *
 * Deliberately separate from floor-plan.store so that selecting a shape
 * never triggers a temporal snapshot and therefore never pollutes the
 * undo/redo history.
 */
import { create } from "zustand";
import type { ShapeId } from "@/core/drawing-engine/drawing.types";

interface SelectionState {
  selectedId: ShapeId | null;
}

interface SelectionActions {
  selectShape: (id: ShapeId | null) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState & SelectionActions>((set) => ({
  selectedId: null,
  selectShape: (id) => set({ selectedId: id }),
  clearSelection: () => set({ selectedId: null }),
}));
