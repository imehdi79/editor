/**
 * mobile-ui.store — ephemeral mobile chrome state that needs to be driven from
 * more than one place. Currently just the selection-editor sheet, which the
 * corner FAB opens and a long-press on the canvas can open too. Kept out of
 * selection.store so opening the editor never touches the document selection.
 */
import { create } from "zustand";

interface MobileUiStore {
  /** Whether the mobile selection-editor sheet is open. */
  editorOpen: boolean;
  openEditor: () => void;
  closeEditor: () => void;
}

export const useMobileUiStore = create<MobileUiStore>((set) => ({
  editorOpen: false,
  openEditor: () => set({ editorOpen: true }),
  closeEditor: () => set({ editorOpen: false }),
}));
