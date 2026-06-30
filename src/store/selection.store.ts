/**
 * selection.store — ephemeral UI selection state.
 *
 * Deliberately separate from floor-plan.store so that selecting a shape (or a
 * derived space) never triggers a temporal snapshot and therefore never pollutes
 * the undo/redo history.
 *
 * A shape and a space are mutually exclusive selections: a space is a DERIVED
 * room (not a document object), selectable to edit its floor/ceiling assemblies,
 * so picking one clears the other.
 */
import { create } from "zustand";
import type { ShapeId } from "@/core/drawing-engine/drawing.types";

interface SelectionState {
  selectedId: ShapeId | null;
  /** Stable id of the selected enclosed space (room), or null. */
  selectedSpaceId: string | null;
}

interface SelectionActions {
  selectShape: (id: ShapeId | null) => void;
  /** Select a derived space (clears any shape selection). */
  selectSpace: (id: string | null) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState & SelectionActions>((set) => ({
  selectedId: null,
  selectedSpaceId: null,
  selectShape: (id) => set({ selectedId: id, selectedSpaceId: null }),
  selectSpace: (id) => set({ selectedSpaceId: id, selectedId: null }),
  clearSelection: () => set({ selectedId: null, selectedSpaceId: null }),
}));
