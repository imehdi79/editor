/**
 * layersStore — per-discipline (system category) visibility for the plan.
 *
 * The foundation of the layer system: each shape carries a `category`
 * (defaulting to architectural) and this store decides which categories are
 * drawn. A hidden category's shapes are excluded from the renderer.
 *
 * Kept separate from editorStore: visibility is a view concern, independent of
 * drawing settings and document state.
 */

import { create } from "zustand";
import { SYSTEM_CATEGORIES, type SystemCategory } from "@/core/layers/systemCategories";

export type CategoryVisibility = Record<SystemCategory, boolean>;

const allVisible = (): CategoryVisibility =>
  Object.fromEntries(SYSTEM_CATEGORIES.map((c) => [c.id, true])) as CategoryVisibility;

interface LayersStore {
  /** Per-category visibility. A hidden category's shapes are not drawn. */
  visibility: CategoryVisibility;
  toggleCategory: (id: SystemCategory) => void;
  setCategoryVisible: (id: SystemCategory, visible: boolean) => void;
}

export const useLayersStore = create<LayersStore>((set) => ({
  visibility: allVisible(),
  toggleCategory: (id) => set((s) => ({ visibility: { ...s.visibility, [id]: !s.visibility[id] } })),
  setCategoryVisible: (id, visible) => set((s) => ({ visibility: { ...s.visibility, [id]: visible } })),
}));
