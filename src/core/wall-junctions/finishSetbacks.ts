/**
 * finishSetbacks — per-layer junction priority for butt joins (Revit/ArchiCAD
 * "layer cleanup"), expressed as how far each end's FINISH bands pull back from
 * the structural cut.
 *
 * At a butt T/L the abutting wall stops against the through ("host") wall. Its
 * structural core reaches the host's structural face (the existing outline corner
 * — unchanged, so dimensions are unaffected), but its finish layers — being lower
 * junction priority — must stop one step earlier, at the host's *finished*
 * surface. The setback is exactly the host's finish build-up on the contacted
 * face; buildWallAssemblyBands shifts only the finish bands back by it.
 *
 * Through/host ends and non-butt joins set back 0 (their layers continue), and a
 * host with no finishes contributes 0 — so plain walls render exactly as before.
 *
 * Pure — no React, no Konva, no store.
 */

import type { Shape, WallShape } from "@/core/drawing-engine/drawing.types";
import type { JunctionConfig, WallEnd } from "./junction.types";
import { computeWallJunctions } from "./computeWallJunctions";
import { nodeKey } from "@/core/topology/computeTopology";
import { finishBuildup } from "@/core/wall-layers/finishedWall";

/** Collinearity tolerance (≈10°) — shared with buttJoin / classifyJunction. */
const COLLINEAR_COS = 0.985;

const dot = (ax: number, ay: number, bx: number, by: number) => ax * bx + ay * by;
const ekey = (e: WallEnd) => `${e.wallId}:${e.handle}`;

/** The through ("host") end at the node + the set of ends that run through it. */
const findHost = (ends: WallEnd[]): { host: WallEnd; through: Set<string> } => {
  // A real through-wall is the thickest collinear pair.
  let pair: { a: WallEnd; b: WallEnd } | null = null;
  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      if (dot(ends[i].dirX, ends[i].dirY, ends[j].dirX, ends[j].dirY) <= -COLLINEAR_COS) {
        const t = Math.max(ends[i].thickness, ends[j].thickness);
        if (!pair || t > Math.max(pair.a.thickness, pair.b.thickness)) pair = { a: ends[i], b: ends[j] };
      }
    }
  }
  if (pair) {
    return {
      host: pair.a.thickness >= pair.b.thickness ? pair.a : pair.b,
      through: new Set([ekey(pair.a), ekey(pair.b)]),
    };
  }
  // No collinear pair (a plain L): the dominant wall runs through.
  const dom = [...ends].sort((x, y) => y.thickness - x.thickness || (x.wallId < y.wallId ? -1 : 1))[0];
  return { host: dom, through: new Set([ekey(dom)]) };
};

const setbackAt = (
  wall: WallShape,
  handle: "p1" | "p2",
  shapes: Record<string, Shape>,
  junctions: ReturnType<typeof computeWallJunctions>,
  defaultStyle: JunctionConfig["joinStyle"],
): number => {
  const nx = handle === "p1" ? wall.x1 : wall.x2;
  const ny = handle === "p1" ? wall.y1 : wall.y2;
  const junction = junctions.get(nodeKey(nx, ny));
  if (!junction || junction.ends.length < 2) return 0;

  // Per-layer cleanup is the butt behaviour (one wall ends into another's face).
  const style = junction.joinStyle ?? defaultStyle;
  if (style !== "butt") return 0;

  const { host, through } = findHost(junction.ends);
  const thisEnd = junction.ends.find((e) => e.wallId === wall.id && e.handle === handle);
  if (!thisEnd || through.has(ekey(thisEnd))) return 0; // through ends continue

  const hostWall = shapes[host.wallId];
  if (!hostWall || hostWall.type !== "wall") return 0;
  const fb = finishBuildup(hostWall);
  if (fb.inner === 0 && fb.outer === 0) return 0;

  // Which host face does this wall abut? Host inner face is its +n = (−hdy, hdx).
  const hdx = hostWall.x2 - hostWall.x1;
  const hdy = hostWall.y2 - hostWall.y1;
  const hlen = Math.hypot(hdx, hdy) || 1;
  const side = dot(thisEnd.dirX, thisEnd.dirY, -hdy / hlen, hdx / hlen);
  return side >= 0 ? fb.inner : fb.outer;
};

/** Finish-band setback (px) at each end of a wall. 0 = layers continue as-is. */
export const finishSetbacksForWall = (
  wall: WallShape,
  shapes: Record<string, Shape>,
  config: JunctionConfig,
): { p1: number; p2: number } => {
  const junctions = computeWallJunctions(shapes);
  return {
    p1: setbackAt(wall, "p1", shapes, junctions, config.joinStyle),
    p2: setbackAt(wall, "p2", shapes, junctions, config.joinStyle),
  };
};
