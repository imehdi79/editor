/**
 * wallLayers — pure helpers for a wall's per-side construction layers.
 *
 * Layers describe how a wall is actually built up on each face (e.g. brick then
 * plaster). They are a specification/takeoff concern only: never drawn or
 * dimensioned on the canvas. These helpers create layers and read / write a
 * side's stack immutably, so callers can hand the result straight to
 * `updateShape(wallId, { layers })`.
 *
 * No React, no Konva, no store access.
 */

import { uid } from "@/lib/uid";
import type { WallLayer, WallShape, WallSide } from "@/core/drawing-engine/drawing.types";

/** Wall faces in display order. */
export const WALL_SIDES = ["inner", "outer"] as const satisfies readonly WallSide[];

export const WALL_SIDE_LABEL: Record<WallSide, string> = {
  inner: "Inner face",
  outer: "Outer face",
};

/**
 * Static catalog of construction materials a layer can be. Each carries a fixed
 * display colour (so a layer reads the same everywhere — canvas swatch + panel)
 * and a sensible default build-up thickness in px (~cm at 100ppm).
 *
 * ponytail: a flat hardcoded list. If materials ever need to be user-defined,
 * promote this to editor state — callers already look colours up by name.
 */
export interface WallMaterial {
  name: string;
  color: string;
  thickness: number;
}

// thickness ≈ real-world cm (ppm is fixed at 100, so 1px = 1cm). Values are
// realistic single-leaf / finish build-ups, so bands read to scale beside a
// typical ~12cm structural wall rather than dwarfing it.
export const WALL_MATERIALS: readonly WallMaterial[] = [
  // { name: "Brick", color: "#c2410c", thickness: 11 }, // orange-700 — single leaf
  { name: "Concrete", color: "#71717a", thickness:  5 }, // zinc-500
  { name: "Block", color: "#52525b", thickness:  5 }, // zinc-600
  { name: "Stone", color: "#57534e", thickness:  5 }, // stone-600
  { name: "Insulation", color: "#facc15", thickness: 5 }, // yellow-400
  { name: "Plaster", color: "#d4d4d8", thickness: 5 }, // zinc-300
  { name: "Drywall", color: "#e7e5e4", thickness: 5 }, // stone-200
  { name: "Wood", color: "#a16207", thickness: 5 }, // yellow-700
  { name: "Tile", color: "#0891b2", thickness: 5 }, // cyan-600
];

const FALLBACK_COLOR = "#94a3b8"; // slate-400 — unknown / legacy material

/** Display colour for a material name (falls back to a neutral grey). */
export const materialColor = (name: string): string =>
  WALL_MATERIALS.find((m) => m.name === name)?.color ?? FALLBACK_COLOR;

/** A fresh layer. Defaults to the first catalog material and its thickness. */
export const createWallLayer = (
  material = WALL_MATERIALS[0].name,
  thickness = WALL_MATERIALS[0].thickness,
): WallLayer => ({
  id: uid(),
  material,
  thickness,
});

/** A wall's layer stack for one face (empty when none defined). */
export const layersOf = (wall: WallShape, side: WallSide): WallLayer[] => wall.layers?.[side] ?? [];

/**
 * Return a complete `layers` record with `side` replaced by `next`, preserving
 * the other side. Use this to build the patch for `updateShape`.
 */
export const withSideLayers = (
  wall: WallShape,
  side: WallSide,
  next: WallLayer[],
): Record<WallSide, WallLayer[]> => ({
  inner: side === "inner" ? next : layersOf(wall, "inner"),
  outer: side === "outer" ? next : layersOf(wall, "outer"),
});

/** A coloured construction band to stroke along the wall, in canvas px. */
export interface WallLayerBand {
  points: [number, number, number, number];
  color: string;
  width: number;
}

/** Which perpendicular direction each face stacks toward (labels are arbitrary). */
const SIDE_DIR: Record<WallSide, number> = { inner: 1, outer: -1 };

/**
 * Geometry for drawing a wall's layers on the canvas: each layer becomes a
 * stroke offset perpendicular from the centerline, stacking outward from the
 * structural face (thickness/2) so it reads as build-up added to the wall.
 *
 * ponytail: corners aren't mitred — bands are per-segment and butt-capped, so
 * adjacent walls leave small gaps at joints. Fine for a takeoff visual; upgrade
 * to a polygon offset if mitred corners are ever needed.
 */
export const buildWallLayerBands = (wall: WallShape): WallLayerBand[] => {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len; // perpendicular unit
  const py = dx / len;

  const bands: WallLayerBand[] = [];
  for (const side of WALL_SIDES) {
    const dir = SIDE_DIR[side];
    let offset = wall.thickness / 2; // start at the structural face
    for (const layer of layersOf(wall, side)) {
      const c = offset + layer.thickness / 2; // band centerline distance
      const ox = px * dir * c;
      const oy = py * dir * c;
      bands.push({
        points: [wall.x1 + ox, wall.y1 + oy, wall.x2 + ox, wall.y2 + oy],
        color: materialColor(layer.material),
        width: layer.thickness,
      });
      offset += layer.thickness;
    }
  }
  return bands;
};
