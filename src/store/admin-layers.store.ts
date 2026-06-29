/**
 * admin-layers.store — an admin-curated palette of materials, the reusable wall
 * construction layers built from them, and the named presets (wall assemblies)
 * those layers compose into.
 *
 * Three linked catalogs:
 *  - **materials** — base building materials (name, colour, default thickness,
 *    unit). Layers and their nested details reference a material here **by id**;
 *    the material's colour drives every swatch.
 *  - **layers** — construction layers (name, material, thickness, unit). Each
 *    layer owns N **details** — atomic sub-layers with the same shape, each
 *    self-describing for estimation (own material, thickness and unit).
 *  - **presets** — categories that group N layers. Each preset entry just
 *    references a layer from the catalog by id; its material/thickness come from
 *    that layer.
 *
 * None of it is consumed by the editor yet — it has **no effect on end users for
 * now**; this is a staging area for a future shared assembly library. All three
 * lists persist to localStorage (materials + layers seed from the built-in
 * material catalog; presets start empty) so they survive reloads.
 */

import { create } from "zustand";
import { uid } from "@/lib/uid";
import { WALL_MATERIALS } from "@/core/wall-layers/wallLayers";
import { DEFAULT_UNIT, type Unit } from "@/core/estimation/units";
import { DEFAULT_ELEMENT_TYPE, type ElementType } from "@/core/estimation/elementTypes";

/** A base building material — the palette layers/details/presets draw from. */
export interface AdminMaterial {
  id: string;
  /** Display + lookup name (everything references a material by name). */
  name: string;
  /** Swatch colour (hex). */
  color: string;
  /** Default build-up thickness in cm (px ≈ cm at 100 ppm). */
  thickness: number;
  /** Unit of measure used to quantify + price this material (estimation layer). */
  unit: Unit;
}

/** An atomic sub-layer nested under a layer — a single material at a thickness,
 *  self-describing for estimation (carries its own unit of measure). */
export interface AdminLayerDetail {
  id: string;
  name: string;
  /** Material id — resolved against the materials palette. */
  materialId: string;
  /** Build-up thickness in cm. */
  thickness: number;
  /** Unit of measure used to quantify + price this sub-layer (estimation layer). */
  unit: Unit;
}

export interface AdminWallLayer {
  id: string;
  /** Display name (e.g. "Plaster 15"). */
  name: string;
  /** Material id — drives the swatch colour via the materials palette. */
  materialId: string;
  /** Build-up thickness in cm (px ≈ cm at 100 ppm). */
  thickness: number;
  /** Unit of measure used to quantify + price this layer (estimation layer). */
  unit: Unit;
  /** Atomic sub-layers this layer is built from (0..n). */
  details: AdminLayerDetail[];
}

/** One entry inside a preset — a reference to a catalog layer by id. */
export interface AdminPresetLayer {
  id: string;
  /** Id of the referenced layer in the layers catalog. */
  layerId: string;
}

/** A category that groups N catalog layers under a name. */
export interface AdminWallPreset {
  id: string;
  name: string;
  /** Building element this assembly applies to (scopes where it can be used). */
  elementType: ElementType;
  /** Referenced layers in exterior→interior order. */
  layers: AdminPresetLayer[];
}

const MATERIALS_KEY = "mehdify.admin.materials.v1";
const LAYERS_KEY = "mehdify.admin.wall-layers.v1";
const PRESETS_KEY = "mehdify.admin.wall-presets.v1";

const seedMaterials = (): AdminMaterial[] =>
  WALL_MATERIALS.map((m) => ({ id: uid(), name: m.name, color: m.color, thickness: m.thickness, unit: DEFAULT_UNIT }));

const seedLayers = (materials: AdminMaterial[]): AdminWallLayer[] =>
  materials.map((m) => ({ id: uid(), name: m.name, materialId: m.id, thickness: m.thickness, unit: m.unit, details: [] }));

/** A persisted layer/detail may carry a legacy `material` *name* and predate `unit`. */
type MaterialRef = { materialId?: string; material?: string };
type LegacyDetail = Omit<AdminLayerDetail, "materialId" | "unit"> & MaterialRef & { unit?: Unit };
type LegacyLayer = Omit<AdminWallLayer, "materialId" | "unit" | "details"> &
  MaterialRef & { unit?: Unit; details?: LegacyDetail[] };

/** Resolve a material id, migrating legacy name refs and dropping dangling ones. */
const resolveMaterialId = (ref: MaterialRef, materials: AdminMaterial[]): string => {
  if (ref.materialId && materials.some((m) => m.id === ref.materialId)) return ref.materialId;
  return materials.find((m) => m.name === ref.material)?.id ?? materials[0]?.id ?? "";
};

/** Resolve a unit, defaulting older records to their material's unit then area. */
const resolveUnit = (unit: Unit | undefined, materialId: string, materials: AdminMaterial[]): Unit =>
  unit ?? materials.find((m) => m.id === materialId)?.unit ?? DEFAULT_UNIT;

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

/** Materials gained a `unit` — default older persisted records to area. */
const loadMaterials = (): AdminMaterial[] =>
  loadList<AdminMaterial>(MATERIALS_KEY, seedMaterials).map((m) => ({ ...m, unit: m.unit ?? DEFAULT_UNIT }));

/** Layers reference materials by id + own a `details` array — migrate legacy
 *  name refs and older records that predate either. Needs the materials list to
 *  map name → id. */
const loadLayers = (materials: AdminMaterial[]): AdminWallLayer[] =>
  loadList<LegacyLayer>(LAYERS_KEY, () => seedLayers(materials)).map((l) => {
    const materialId = resolveMaterialId(l, materials);
    return {
      id: l.id,
      name: l.name,
      thickness: l.thickness,
      materialId,
      unit: resolveUnit(l.unit, materialId, materials),
      details: Array.isArray(l.details)
        ? l.details.map((d) => {
            const detailMaterialId = resolveMaterialId(d, materials);
            return {
              id: d.id,
              name: d.name,
              thickness: d.thickness,
              materialId: detailMaterialId,
              unit: resolveUnit(d.unit, detailMaterialId, materials),
            };
          })
        : [],
    };
  });

/** Preset entries became layer references + gained an element type — normalise. */
const loadPresets = (): AdminWallPreset[] =>
  loadList<AdminWallPreset>(PRESETS_KEY, () => []).map((p) => ({
    ...p,
    elementType: p.elementType ?? DEFAULT_ELEMENT_TYPE,
    layers: Array.isArray(p.layers) ? p.layers.map((l) => ({ id: l.id, layerId: l.layerId ?? "" })) : [],
  }));

const persist = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — keep the in-memory copy */
  }
};

interface AdminLayersStore {
  materials: AdminMaterial[];
  layers: AdminWallLayer[];
  presets: AdminWallPreset[];

  /** Materials palette — the source of every material option + swatch colour. */
  addMaterial: () => void;
  updateMaterial: (id: string, patch: Partial<Omit<AdminMaterial, "id">>) => void;
  removeMaterial: (id: string) => void;

  /** Append a fresh layer seeded from the first palette material. */
  addLayer: () => void;
  updateLayer: (id: string, patch: Partial<Omit<AdminWallLayer, "id" | "details">>) => void;
  removeLayer: (id: string) => void;

  /** Each layer owns N details (same shape as a layer, minus children). */
  addLayerDetail: (layerId: string) => void;
  updateLayerDetail: (layerId: string, detailId: string, patch: Partial<Omit<AdminLayerDetail, "id">>) => void;
  removeLayerDetail: (layerId: string, detailId: string) => void;

  /** Create an empty-named preset with one starter layer. */
  addPreset: () => void;
  renamePreset: (id: string, name: string) => void;
  setPresetElementType: (id: string, elementType: ElementType) => void;
  removePreset: (id: string) => void;
  addPresetLayer: (presetId: string) => void;
  updatePresetLayer: (presetId: string, layerId: string, patch: Partial<Omit<AdminPresetLayer, "id">>) => void;
  removePresetLayer: (presetId: string, layerId: string) => void;
}

export const useAdminLayersStore = create<AdminLayersStore>((set, get) => {
  const commitMaterials = (materials: AdminMaterial[]) => {
    persist(MATERIALS_KEY, materials);
    set({ materials });
  };
  const commitLayers = (layers: AdminWallLayer[]) => {
    persist(LAYERS_KEY, layers);
    set({ layers });
  };
  const commitPresets = (presets: AdminWallPreset[]) => {
    persist(PRESETS_KEY, presets);
    set({ presets });
  };
  const mapLayer = (id: string, fn: (l: AdminWallLayer) => AdminWallLayer) =>
    commitLayers(get().layers.map((l) => (l.id === id ? fn(l) : l)));
  const mapPreset = (id: string, fn: (p: AdminWallPreset) => AdminWallPreset) =>
    commitPresets(get().presets.map((p) => (p.id === id ? fn(p) : p)));

  /** Defaults for a fresh slice: the first palette material (undefined if none). */
  const base = (): AdminMaterial | undefined => get().materials[0];

  const freshMaterial = (): AdminMaterial => ({ id: uid(), name: "", color: "#94a3b8", thickness: 5, unit: DEFAULT_UNIT });
  const freshLayer = (): AdminWallLayer => {
    const b = base();
    return { id: uid(), name: b?.name ?? "", materialId: b?.id ?? "", thickness: b?.thickness ?? 5, unit: b?.unit ?? DEFAULT_UNIT, details: [] };
  };
  const freshDetail = (): AdminLayerDetail => {
    const b = base();
    return { id: uid(), name: b?.name ?? "", materialId: b?.id ?? "", thickness: b?.thickness ?? 5, unit: b?.unit ?? DEFAULT_UNIT };
  };
  const freshPresetLayer = (): AdminPresetLayer => ({ id: uid(), layerId: get().layers[0]?.id ?? "" });

  // Materials load first; layers migrate their (legacy name) refs against them.
  const initialMaterials = loadMaterials();

  return {
    materials: initialMaterials,
    layers: loadLayers(initialMaterials),
    presets: loadPresets(),

    addMaterial: () => commitMaterials([...get().materials, freshMaterial()]),
    updateMaterial: (id, patch) => commitMaterials(get().materials.map((m) => (m.id === id ? { ...m, ...patch } : m))),
    removeMaterial: (id) => commitMaterials(get().materials.filter((m) => m.id !== id)),

    addLayer: () => commitLayers([...get().layers, freshLayer()]),
    updateLayer: (id, patch) => commitLayers(get().layers.map((l) => (l.id === id ? { ...l, ...patch } : l))),
    removeLayer: (id) => commitLayers(get().layers.filter((l) => l.id !== id)),

    addLayerDetail: (layerId) => mapLayer(layerId, (l) => ({ ...l, details: [...l.details, freshDetail()] })),
    updateLayerDetail: (layerId, detailId, patch) =>
      mapLayer(layerId, (l) => ({
        ...l,
        details: l.details.map((d) => (d.id === detailId ? { ...d, ...patch } : d)),
      })),
    removeLayerDetail: (layerId, detailId) =>
      mapLayer(layerId, (l) => ({ ...l, details: l.details.filter((d) => d.id !== detailId) })),

    addPreset: () =>
      commitPresets([
        ...get().presets,
        { id: uid(), name: "", elementType: DEFAULT_ELEMENT_TYPE, layers: [freshPresetLayer()] },
      ]),
    renamePreset: (id, name) => mapPreset(id, (p) => ({ ...p, name })),
    setPresetElementType: (id, elementType) => mapPreset(id, (p) => ({ ...p, elementType })),
    removePreset: (id) => commitPresets(get().presets.filter((p) => p.id !== id)),
    addPresetLayer: (presetId) => mapPreset(presetId, (p) => ({ ...p, layers: [...p.layers, freshPresetLayer()] })),
    updatePresetLayer: (presetId, layerId, patch) =>
      mapPreset(presetId, (p) => ({
        ...p,
        layers: p.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)),
      })),
    removePresetLayer: (presetId, layerId) =>
      mapPreset(presetId, (p) => ({ ...p, layers: p.layers.filter((l) => l.id !== layerId) })),
  };
});
