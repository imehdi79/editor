/**
 * drawingInfoEditStore — bridges the canvas-rendered drawing-info table (which
 * lives inside the Konva tree and cannot host HTML inputs) with the DOM edit
 * overlay (a real <input> positioned over the tapped cell).
 *
 * The canvas writes the tapped cell's screen rect + the field it edits here;
 * the DOM overlay reads it, renders the input, and clears on commit/cancel.
 */

import { create } from "zustand";
import type { EditField } from "@/core/drawing-info/buildDrawingInfo";

export interface DrawingInfoEdit {
  /** Shape id the edited cell belongs to. */
  rowId: string;
  /** Which shape field this cell writes to. */
  field: EditField;
  /** Current value in the display unit (cm for height). */
  value: number;
  /** Screen-space rect of the cell (page coordinates, px). */
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DrawingInfoEditStore {
  editing: DrawingInfoEdit | null;
  setEditing: (edit: DrawingInfoEdit) => void;
  clearEditing: () => void;
}

export const useDrawingInfoEditStore = create<DrawingInfoEditStore>((set) => ({
  editing: null,
  setEditing: (editing) => set({ editing }),
  clearEditing: () => set({ editing: null }),
}));
