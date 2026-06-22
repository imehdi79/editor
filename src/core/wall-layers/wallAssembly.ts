/**
 * wallAssembly — derive a wall's full-width BIM layer assembly.
 *
 * A composite wall is one ordered stack of layers across its whole thickness,
 * exterior(−n / "outer") → interior(+n / "inner"), each with a construction
 * `function` (its junction priority) and a signed face offset from the wall
 * centreline (along +n). The structural core is the [coreStart..coreEnd] slice;
 * the centreline is the core's centre, so the structural body keeps spanning
 * ±thickness/2 exactly as the outline / dimensions expect.
 *
 * A wall may carry an explicit `assembly`; otherwise it is derived from the
 * legacy monolithic `thickness` (the structural core) plus the per-side finish
 * stacks (`layers.inner/outer`). Deriving lazily keeps old documents valid with
 * no migration — every consumer reads through this helper.
 *
 * Pure — no React, no Konva, no store.
 */

import type { ArcWallShape, LayerFunction, WallLayer, WallShape } from "@/core/drawing-engine/drawing.types";
import { layersOf } from "./wallLayers";

/** Any wall that carries a composite assembly — straight or arc (identical model). */
export type LayeredWall = WallShape | ArcWallShape;

/** Junction priority by function — a lower number wins (passes through a joint). */
export const FUNCTION_PRIORITY: Record<LayerFunction, number> = {
  structure: 1,
  substrate: 2,
  thermal: 3,
  finish1: 4,
  finish2: 5,
  membrane: 6,
};

/** Functions in exterior→interior assembly order (for UI ordering / presets). */
export const LAYER_FUNCTIONS: readonly LayerFunction[] = [
  "finish2",
  "finish1",
  "thermal",
  "substrate",
  "structure",
  "membrane",
];

export interface ResolvedLayer extends WallLayer {
  function: LayerFunction;
  /** Signed +n face offsets from the wall centreline; `start` < `end`. */
  start: number;
  end: number;
  /** Belongs to the structural core. */
  isCore: boolean;
}

export interface ResolvedAssembly {
  /** Layers ordered exterior(−n) → interior(+n). */
  layers: ResolvedLayer[];
  /** Signed +n offset of the core's exterior / interior boundary. */
  coreStart: number;
  coreEnd: number;
  /** Total build-up thickness (px). */
  total: number;
}

const sumThickness = (ls: readonly WallLayer[]): number => ls.reduce((s, l) => s + l.thickness, 0);

const fnOf = (l: WallLayer, isCore: boolean): LayerFunction =>
  l.function ?? (isCore ? "structure" : "finish1");

/** Position an ordered (ext→int) layer list so the structural core is centred. */
const layout = (ordered: readonly { layer: WallLayer; isCore: boolean }[]): ResolvedAssembly => {
  const total = sumThickness(ordered.map((o) => o.layer));

  // Locate the core slice in raw (from-zero) coordinates.
  let raw = 0;
  let coreRawStart = 0;
  let coreThk = 0;
  let seenCore = false;
  for (const o of ordered) {
    if (o.isCore) {
      if (!seenCore) {
        coreRawStart = raw;
        seenCore = true;
      }
      coreThk += o.layer.thickness;
    }
    raw += o.layer.thickness;
  }
  if (!seenCore) {
    coreRawStart = 0;
    coreThk = total; // no marked core → treat the whole wall as core
  }

  // Shift so the core centre lands on the centreline (offset 0).
  const shift = -(coreRawStart + coreThk / 2);
  let pos = shift;
  const layers: ResolvedLayer[] = ordered.map(({ layer, isCore }) => {
    const start = pos;
    const end = pos + layer.thickness;
    pos = end;
    return { ...layer, function: fnOf(layer, isCore), start, end, isCore };
  });

  return {
    layers,
    coreStart: coreRawStart + shift,
    coreEnd: coreRawStart + coreThk + shift,
    total,
  };
};

/** The full-width composite assembly for a wall (explicit, else derived). */
export const wallAssembly = (wall: LayeredWall): ResolvedAssembly => {
  if (wall.assembly && wall.assembly.length > 0) {
    const cs = wall.coreStart ?? 0;
    const ce = wall.coreEnd ?? wall.assembly.length - 1;
    return layout(wall.assembly.map((layer, i) => ({ layer, isCore: i >= cs && i <= ce })));
  }

  // Legacy: outermost outer finish → … → core slab → … → innermost inner finish.
  // Outer layers stack outward from the core face, so the outermost is last in
  // the stored array — reverse it to read exterior→interior.
  const outer = layersOf(wall, "outer");
  const inner = layersOf(wall, "inner");
  const core: WallLayer = {
    id: `${wall.id}-core`,
    material: "", // empty = structural body (renderer fills with the wall colour)
    thickness: wall.thickness,
    function: "structure",
  };
  const ordered = [
    ...[...outer].reverse().map((layer) => ({ layer, isCore: false })),
    { layer: core, isCore: true },
    ...inner.map((layer) => ({ layer, isCore: false })),
  ];
  return layout(ordered);
};
