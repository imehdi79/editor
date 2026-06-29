/**
 * admin-layers.store — an admin-curated catalog of reusable wall construction
 * layers plus the named presets (wall assemblies) built from them.
 *
 * Admins define single layers (name, material, build-up thickness) and bundle
 * them into ordered presets — reusable wall build-ups, the same model as
 * `wallAssembly` / `ASSEMBLY_PRESETS`. Neither catalog is consumed by the editor
 * yet — they have **no effect on end users for now**; this is a staging area for
 * a future shared assembly library. Both lists persist to localStorage (the
 * layer catalog is seeded from the built-in material catalog; presets start
 * empty) so they survive reloads.
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

/** One layer inside a preset — a material slice (no display name of its own). */
export interface AdminPresetLayer {
  id: string;
  /** Material key — drives the swatch colour via `materialColor`. */
  material: string;
  /** Build-up thickness in cm (px ≈ cm at 100 ppm). */
  thickness: number;
}

/** A named, ordered wall assembly the admin composes from layers. */
export interface AdminWallPreset {
  id: string;
  name: string;
  /** Layers in exterior→interior order. */
  layers: AdminPresetLayer[];
}

const LAYERS_KEY = "mehdify.admin.wall-layers.v1";
const DETAILS_KEY = "mehdify.admin.layer-details.v1";
const PRESETS_KEY = "mehdify.admin.wall-presets.v1";

const seed = (): AdminWallLayer[] =>
  WALL_MATERIALS.map((m) => ({ id: uid(), name: m.name, material: m.name, thickness: m.thickness }));

/** A fresh layer seeded from the first catalog material. */
const freshLayer = (): AdminPresetLayer => {
  const base = WALL_MATERIALS[0];
  return { id: uid(), material: base.name, thickness: base.thickness };
};

/** Read a localStorage list, falling back to `fallback` on miss / parse error. */
const loadList = <T>(key: string, fallback: () => T[]): T[] => {
  if (typeof window === "undefined") return fallback();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback();
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : fallback();
  } catch {
    return fallback();
  }
};

const persist = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — keep the in-memory copy */
  }
};

interface AdminLayersStore {
  layers: AdminWallLayer[];
  /** A second catalog with the same shape — the "layer details" list. */
  details: AdminWallLayer[];
  presets: AdminWallPreset[];

  /** Append a fresh layer seeded from the first catalog material. */
  addLayer: () => void;
  updateLayer: (id: string, patch: Partial<Omit<AdminWallLayer, "id">>) => void;
  removeLayer: (id: string) => void;

  /** Layer-details catalog — identical operations to the layer catalog. */
  addDetail: () => void;
  updateDetail: (id: string, patch: Partial<Omit<AdminWallLayer, "id">>) => void;
  removeDetail: (id: string) => void;

  /** Create an empty-named preset with one starter layer. */
  addPreset: () => void;
  renamePreset: (id: string, name: string) => void;
  removePreset: (id: string) => void;
  addPresetLayer: (presetId: string) => void;
  updatePresetLayer: (presetId: string, layerId: string, patch: Partial<Omit<AdminPresetLayer, "id">>) => void;
  removePresetLayer: (presetId: string, layerId: string) => void;
}

export const useAdminLayersStore = create<AdminLayersStore>((set, get) => {
  const commitLayers = (layers: AdminWallLayer[]) => {
    persist(LAYERS_KEY, layers);
    set({ layers });
  };
  const commitDetails = (details: AdminWallLayer[]) => {
    persist(DETAILS_KEY, details);
    set({ details });
  };
  const commitPresets = (presets: AdminWallPreset[]) => {
    persist(PRESETS_KEY, presets);
    set({ presets });
  };
  const mapPreset = (id: string, fn: (p: AdminWallPreset) => AdminWallPreset) =>
    commitPresets(get().presets.map((p) => (p.id === id ? fn(p) : p)));

  const freshCatalogLayer = (): AdminWallLayer => {
    const base = WALL_MATERIALS[0];
    return { id: uid(), name: base.name, material: base.name, thickness: base.thickness };
  };

  return {
    layers: loadList(LAYERS_KEY, seed),
    details: loadList(DETAILS_KEY, () => []),
    presets: loadList(PRESETS_KEY, () => []),

    addLayer: () => commitLayers([...get().layers, freshCatalogLayer()]),
    updateLayer: (id, patch) => commitLayers(get().layers.map((l) => (l.id === id ? { ...l, ...patch } : l))),
    removeLayer: (id) => commitLayers(get().layers.filter((l) => l.id !== id)),

    addDetail: () => commitDetails([...get().details, freshCatalogLayer()]),
    updateDetail: (id, patch) => commitDetails(get().details.map((l) => (l.id === id ? { ...l, ...patch } : l))),
    removeDetail: (id) => commitDetails(get().details.filter((l) => l.id !== id)),

    addPreset: () => commitPresets([...get().presets, { id: uid(), name: "", layers: [freshLayer()] }]),
    renamePreset: (id, name) => mapPreset(id, (p) => ({ ...p, name })),
    removePreset: (id) => commitPresets(get().presets.filter((p) => p.id !== id)),
    addPresetLayer: (presetId) => mapPreset(presetId, (p) => ({ ...p, layers: [...p.layers, freshLayer()] })),
    updatePresetLayer: (presetId, layerId, patch) =>
      mapPreset(presetId, (p) => ({
        ...p,
        layers: p.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)),
      })),
    removePresetLayer: (presetId, layerId) =>
      mapPreset(presetId, (p) => ({ ...p, layers: p.layers.filter((l) => l.id !== layerId) })),
  };
});
