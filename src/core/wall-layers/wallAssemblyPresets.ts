/**
 * wallAssemblyPresets — professional composite-wall starting points.
 *
 * Each preset is an ordered exterior→interior layer stack with a marked
 * structural-core slice, expressed with `WALL_MATERIALS` names and px≈cm
 * thicknesses (100 ppm). `presetToPatch` turns one into a `ShapePatch` for
 * `updateShape` (fresh layer ids, `thickness` = the core width that dimensions
 * reference). Preset NAMES are localized via `assemblyPresets.<id>` in i18n.
 *
 * Pure — no React, no Konva, no store.
 */

import { uid } from "@/lib/uid";
import type { LayerFunction, WallLayer } from "@/core/drawing-engine/drawing.types";

interface PresetLayer {
  material: string;
  thickness: number;
  function: LayerFunction;
}

export interface AssemblyPreset {
  /** i18n key suffix under `assemblyPresets.*`. */
  id: string;
  layers: PresetLayer[];
  /** Inclusive structural-core slice indices. */
  coreStart: number;
  coreEnd: number;
}

export const ASSEMBLY_PRESETS: readonly AssemblyPreset[] = [
  {
    id: "singleLeaf", // plastered single-leaf masonry
    layers: [
      { material: "Plaster", thickness: 1.5, function: "finish1" },
      { material: "Block", thickness: 12, function: "structure" },
      { material: "Plaster", thickness: 1.5, function: "finish1" },
    ],
    coreStart: 1,
    coreEnd: 1,
  },
  {
    id: "insulatedBlock", // block + internal insulation + dry lining
    layers: [
      { material: "Plaster", thickness: 1.5, function: "finish1" },
      { material: "Block", thickness: 12, function: "structure" },
      { material: "Insulation", thickness: 6, function: "thermal" },
      { material: "Drywall", thickness: 1.25, function: "finish1" },
    ],
    coreStart: 1,
    coreEnd: 1,
  },
  {
    id: "cavityWall", // outer leaf + cavity insulation + inner structural leaf
    layers: [
      { material: "Block", thickness: 9, function: "finish2" },
      { material: "Insulation", thickness: 5, function: "thermal" },
      { material: "Block", thickness: 12, function: "structure" },
      { material: "Plaster", thickness: 1.5, function: "finish1" },
    ],
    coreStart: 2,
    coreEnd: 2,
  },
  {
    id: "studPartition", // timber/metal stud with both faces lined
    layers: [
      { material: "Drywall", thickness: 1.25, function: "finish1" },
      { material: "Wood", thickness: 7, function: "structure" },
      { material: "Drywall", thickness: 1.25, function: "finish1" },
    ],
    coreStart: 1,
    coreEnd: 1,
  },
];

export interface AssemblyPatch {
  assembly: WallLayer[];
  coreStart: number;
  coreEnd: number;
  thickness: number;
}

/** Sum the thickness of an inclusive index slice — the structural-core width. */
export const coreWidth = (layers: { thickness: number }[], coreStart: number, coreEnd: number): number =>
  layers.slice(coreStart, coreEnd + 1).reduce((s, l) => s + l.thickness, 0);

/** Build an `updateShape` patch from a preset (fresh ids; thickness = core width). */
export const presetToPatch = (preset: AssemblyPreset): AssemblyPatch => {
  const assembly: WallLayer[] = preset.layers.map((l) => ({
    id: uid(),
    material: l.material,
    thickness: l.thickness,
    function: l.function,
  }));
  return {
    assembly,
    coreStart: preset.coreStart,
    coreEnd: preset.coreEnd,
    thickness: coreWidth(assembly, preset.coreStart, preset.coreEnd),
  };
};
