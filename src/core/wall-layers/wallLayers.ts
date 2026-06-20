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
import { intersectLines, type WallOutline } from "@/core/wall-junctions";

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

/** A wall's layer stack for one face (empty when none defined). Accepts any
 *  layered wall (straight or arc) structurally. */
export const layersOf = (wall: { layers?: Record<WallSide, WallLayer[]> }, side: WallSide): WallLayer[] =>
  wall.layers?.[side] ?? [];

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

/** A coloured construction band to fill along the wall, in canvas px. */
export interface WallLayerBand {
  /** Closed quad polygon as a flat [x,y,x,y,...] list (Konva points). */
  polygon: number[];
  color: string;
}

/** Which perpendicular direction each face stacks toward (inner = +n). */
const SIDE_DIR: Record<WallSide, number> = { inner: 1, outer: -1 };

/**
 * Geometry for drawing a wall's construction layers on the canvas: each layer is
 * a filled quad offset perpendicular from the centerline, stacking outward from
 * the structural face (thickness/2) so it reads as build-up added to the wall.
 *
 * Band ends follow the wall body's mitred corners: each end is cut along the
 * line through that end's inner+outer outline corners, so adjacent walls' bands
 * meet at the joint with no gap (matching the structural body). Per-layer
 * matching across the junction (different stacks meeting) is wj-14's concern.
 */
export const buildWallLayerBands = (wall: WallShape, outline: WallOutline): WallLayerBand[] => {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len; // +n perpendicular unit (left-hand normal)
  const py = dx / len;
  const off = wall.offset ?? 0; // eccentric body shift along +n

  // End-cut lines: through each end's inner & outer body corners. All bands at
  // an end are cut by the same line, so they share the corner's mitre angle.
  const cut1 = { ox: outline.p1Inner.x, oy: outline.p1Inner.y, dx: outline.p1Outer.x - outline.p1Inner.x, dy: outline.p1Outer.y - outline.p1Inner.y };
  const cut2 = { ox: outline.p2Inner.x, oy: outline.p2Inner.y, dx: outline.p2Outer.x - outline.p2Inner.x, dy: outline.p2Outer.y - outline.p2Inner.y };

  /** Where the offset line (at distance `o` on side `dir`) meets an end-cut line.
   *  The eccentric body shift `off` moves every band line along +n. */
  const cornerAt = (o: number, dir: number, cut: { ox: number; oy: number; dx: number; dy: number }, fallbackX: number, fallbackY: number) => {
    const s = off + dir * o;
    const lx = wall.x1 + px * s;
    const ly = wall.y1 + py * s;
    const hit = intersectLines(lx, ly, dx / len, dy / len, cut.ox, cut.oy, cut.dx, cut.dy);
    return hit ?? { x: fallbackX + px * s, y: fallbackY + py * s };
  };

  const bands: WallLayerBand[] = [];
  for (const side of WALL_SIDES) {
    const dir = SIDE_DIR[side];
    let offset = wall.thickness / 2; // start at the structural face
    for (const layer of layersOf(wall, side)) {
      const o2 = offset + layer.thickness; // outer edge of this band
      const a = cornerAt(offset, dir, cut1, wall.x1, wall.y1);
      const b = cornerAt(offset, dir, cut2, wall.x2, wall.y2);
      const c = cornerAt(o2, dir, cut2, wall.x2, wall.y2);
      const d = cornerAt(o2, dir, cut1, wall.x1, wall.y1);
      bands.push({
        polygon: [a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y],
        color: materialColor(layer.material),
      });
      offset = o2;
    }
  }
  return bands;
};
