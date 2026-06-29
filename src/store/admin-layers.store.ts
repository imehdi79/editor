/**
 * admin-layers.store — an admin-curated catalog of reusable wall construction
 * layers.
 *
 * Admins define layers here (name, material, build-up thickness) so a shared
 * library can be assembled centrally. This catalog is NOT yet consumed by the
 * editor — it has **no effect on end users for now**; it's a staging area for a
 * future shared assembly library. Persisted to localStorage (seeded from the
 * built-in material catalog) so it survives reloads.
 */

import { create } from "zustand";
import { uid } from "@/lib/uid";
import { WALL_MATERIALS } from "@/core/wall-layers/wallLayers";

export interface AdminWallLayer {
  id: string;
  /** Display name (e.g. "Plaster 15"). */
  name: string;
  /** Material key — drives the swatch colour via `materialColor`. */
  material: string;
  /** Build-up thickness in cm (px ≈ cm at 100 ppm). */
  thickness: number;
}

const STORAGE_KEY = "mehdify.admin.wall-layers.v1";

const seed = (): AdminWallLayer[] =>
  WALL_MATERIALS.map((m) => ({ id: uid(), name: m.name, material: m.name, thickness: m.thickness }));

const load = (): AdminWallLayer[] => {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as AdminWallLayer[];
    return Array.isArray(parsed) ? parsed : seed();
  } catch {
    return seed();
  }
};

const persist = (layers: AdminWallLayer[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layers));
  } catch {
    /* quota / private mode — keep the in-memory catalog */
  }
};

interface AdminLayersStore {
  layers: AdminWallLayer[];
  /** Append a fresh layer seeded from the first catalog material. */
  addLayer: () => void;
  updateLayer: (id: string, patch: Partial<Omit<AdminWallLayer, "id">>) => void;
  removeLayer: (id: string) => void;
}

export const useAdminLayersStore = create<AdminLayersStore>((set, get) => {
  const commit = (layers: AdminWallLayer[]) => {
    persist(layers);
    set({ layers });
  };
  return {
    layers: load(),
    addLayer: () => {
      const base = WALL_MATERIALS[0];
      commit([...get().layers, { id: uid(), name: base.name, material: base.name, thickness: base.thickness }]);
    },
    updateLayer: (id, patch) => commit(get().layers.map((l) => (l.id === id ? { ...l, ...patch } : l))),
    removeLayer: (id) => commit(get().layers.filter((l) => l.id !== id)),
  };
});
