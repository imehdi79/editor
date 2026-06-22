/**
 * finishedWall — the FULL finished build-up of a composite wall, for measuring
 * the inner/outer references to the finished faces (core + finish layers).
 *
 * The structural outline (computeWallOutline) is built from the structural-core
 * `thickness`, so its faces are the core faces. To dimension the *finished*
 * faces we feed computeWallOutlines a derived shapes map where every wall is a
 * plain wall whose thickness/offset span the whole assembly — then its outline
 * corners are the finished faces. A plain (un-layered) wall is returned
 * unchanged, so legacy drawings measure exactly as before.
 *
 * Pure — no React, no Konva, no store.
 */

import type { ArcWallShape, Shape, WallShape } from "@/core/drawing-engine/drawing.types";
import { wallAssembly } from "./wallAssembly";

/** Finish build-up beyond the structural core on each face (px). Accepts any
 *  layered wall (straight or arc). */
export const finishBuildup = (wall: WallShape | ArcWallShape): { inner: number; outer: number } => {
  const { layers, coreStart, coreEnd } = wallAssembly(wall);
  // Assembly is exterior(−n / outer) → interior(+n / inner); the core is the
  // [coreStart..coreEnd] slice, so layers before it are outer finishes, after it
  // inner finishes.
  const outer = layers.slice(0, coreStart).reduce((s, l) => s + l.thickness, 0);
  const inner = layers.slice(coreEnd + 1).reduce((s, l) => s + l.thickness, 0);
  return { inner, outer };
};

const cache = new WeakMap<Record<string, Shape>, Record<string, Shape>>();

/**
 * A shapes map with every wall replaced by an equivalent plain wall whose body
 * spans the full finished build-up (thickness grows by both finishes; offset
 * shifts by half their asymmetry). Endpoints are untouched, so topology and
 * junctions are identical — only the faces move out to the finishes. WeakMap-
 * cached so the downstream outline cache stays valid for the render pass.
 */
export const finishedWallShapes = (shapes: Record<string, Shape>): Record<string, Shape> => {
  const hit = cache.get(shapes);
  if (hit) return hit;

  const out: Record<string, Shape> = {};
  for (const [id, s] of Object.entries(shapes)) {
    if (s.type !== "wall") {
      out[id] = s;
      continue;
    }
    const { inner, outer } = finishBuildup(s);
    if (inner === 0 && outer === 0) {
      out[id] = s; // no finishes — measured exactly like the core
      continue;
    }
    out[id] = {
      ...s,
      thickness: s.thickness + inner + outer,
      offset: (s.offset ?? 0) + (inner - outer) / 2,
      thicknessP1: undefined,
      thicknessP2: undefined,
      layers: undefined,
      assembly: undefined,
      coreStart: undefined,
      coreEnd: undefined,
    };
  }
  cache.set(shapes, out);
  return out;
};
