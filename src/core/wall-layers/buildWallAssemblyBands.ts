/**
 * buildWallAssemblyBands — canvas geometry for a wall's BIM composite assembly.
 *
 * Every layer of `wallAssembly` becomes a filled quad spanning its [start,end]
 * face offsets along +n, with both ends cut along the wall body's mitred corner
 * lines (so adjacent walls meet cleanly at a joint, exactly like the structural
 * body). Internal layer boundaries become thin separator lines; the two core
 * boundaries become heavier lines — the professional CAD read of a composite
 * wall.
 *
 * The end-cut lines come from the structural outline corners (p1Inner→p1Outer,
 * p2Inner→p2Outer). Finish layers beyond the structural face extend along those
 * same infinite mitre lines, so finishes mitre with the body at every corner.
 *
 * Pure — no React, no Konva, no store.
 */

import type { WallShape } from "@/core/drawing-engine/drawing.types";
import { intersectLines, type WallOutline } from "@/core/wall-junctions";
import { endThickness } from "@/core/wall-utils/wallThickness";
import { materialColor } from "./wallLayers";
import { wallAssembly } from "./wallAssembly";

export interface AssemblyBand {
  /** Closed quad as a flat [x,y,...] list (Konva points). */
  polygon: number[];
  /** Material name (drives fill colour + hatch); empty = structural core. */
  material: string;
  /** Material fill colour; empty string = use the structural wall colour. */
  color: string;
  isCore: boolean;
}

export interface AssemblyBands {
  bands: AssemblyBand[];
  /** Thin separator lines between adjacent layers, each [x1,y1,x2,y2]. */
  separators: number[][];
  /** Heavier structural-core boundary lines, each [x1,y1,x2,y2]. */
  coreLines: number[][];
}

interface CutLine {
  ox: number;
  oy: number;
  dx: number;
  dy: number;
}

const EPS = 1e-6;

/**
 * @param setback  Per-end FINISH-band pull-back (px) for butt-junction layer
 *   cleanup (finishSetbacksForWall). The structural core keeps the structural
 *   cut; only finish bands at that end stop `setback` short, so the abutting
 *   wall's finishes meet the host's finished surface. 0 = layers continue.
 */
export const buildWallAssemblyBands = (
  wall: WallShape,
  outline: WallOutline,
  setback?: { p1: number; p2: number },
): AssemblyBands => {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -dy / len; // +n (left-hand normal)
  const py = dx / len;
  const off = wall.offset ?? 0; // eccentric body shift along +n

  // End-cut lines through each end's inner & outer outline corners. All layers
  // at an end share the same cut line, so they meet the joint at one mitre angle.
  const cut1: CutLine = {
    ox: outline.p1Inner.x,
    oy: outline.p1Inner.y,
    dx: outline.p1Outer.x - outline.p1Inner.x,
    dy: outline.p1Outer.y - outline.p1Inner.y,
  };
  const cut2: CutLine = {
    ox: outline.p2Inner.x,
    oy: outline.p2Inner.y,
    dx: outline.p2Outer.x - outline.p2Inner.x,
    dy: outline.p2Outer.y - outline.p2Inner.y,
  };

  /** Where the +n offset line at signed distance `s` meets an end-cut line. */
  const cornerAt = (s: number, cut: CutLine, fx: number, fy: number) => {
    const t = off + s;
    const lx = wall.x1 + px * t;
    const ly = wall.y1 + py * t;
    const hit = intersectLines(lx, ly, ux, uy, cut.ox, cut.oy, cut.dx, cut.dy);
    return hit ?? { x: fx + px * t, y: fy + py * t };
  };

  // Per-layer junction priority: at a butt join the structural core (priority 1)
  // passes through the joint and keeps the structural cut, while the lower-
  // priority FINISH bands stop `setback` short — at the host wall's *finished*
  // surface. The finish cut is the structural cut slid along the wall axis toward
  // the interior by the per-end setback (0 ⇒ identical to the structural cut, so
  // plain walls and non-butt joins are byte-for-byte unchanged).
  const sb1 = setback?.p1 ?? 0;
  const sb2 = setback?.p2 ?? 0;
  const cut1F: CutLine = { ...cut1, ox: cut1.ox + ux * sb1, oy: cut1.oy + uy * sb1 };
  const cut2F: CutLine = { ...cut2, ox: cut2.ox - ux * sb2, oy: cut2.oy - uy * sb2 };

  // Per-node taper: a wall may be thinner/thicker at each end (thicknessP1/P2).
  // `wallAssembly` lays the layers out at the nominal (mean) thickness, so scale
  // each end's +n face offsets by its own end/nominal ratio. The structural core
  // (±thickness/2) then lands exactly on the mitred outline corners, and every
  // layer + separator tapers with the body. Uniform walls keep k = 1 (no-op).
  const baseThk = wall.thickness > EPS ? wall.thickness : 1;
  const k1 = endThickness(wall, "p1") / baseThk;
  const k2 = endThickness(wall, "p2") / baseThk;
  const p1At = (s: number, isCore: boolean) =>
    cornerAt(s * k1, isCore ? cut1 : cut1F, wall.x1, wall.y1);
  const p2At = (s: number, isCore: boolean) =>
    cornerAt(s * k2, isCore ? cut2 : cut2F, wall.x2, wall.y2);
  /** A full cross-wall line at offset `s`, cut to the core or the finish faces. */
  const crossAt = (s: number, isCore: boolean): number[] => {
    const a = p1At(s, isCore);
    const b = p2At(s, isCore);
    return [a.x, a.y, b.x, b.y];
  };

  const { layers, coreStart, coreEnd } = wallAssembly(wall);

  const bands: AssemblyBand[] = layers.map((l) => {
    const a = p1At(l.start, l.isCore);
    const b = p2At(l.start, l.isCore);
    const c = p2At(l.end, l.isCore);
    const d = p1At(l.end, l.isCore);
    return {
      polygon: [a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y],
      material: l.material,
      color: l.material ? materialColor(l.material) : "",
      isCore: l.isCore,
    };
  });

  // Every layer boundary gets an edge line: the two silhouette faces, the
  // internal separators, and the structural-core boundaries (drawn heavier).
  // Collect each boundary once (the first layer's outer face + every layer's
  // inner face — shared boundaries coincide and aren't duplicated). The core
  // boundaries follow the structural cut; finish separators follow the setback.
  const boundaries = layers.length > 0 ? [layers[0].start, ...layers.map((l) => l.end)] : [];
  const isCoreBoundary = (s: number) => Math.abs(s - coreStart) < EPS || Math.abs(s - coreEnd) < EPS;

  const separators = boundaries.filter((s) => !isCoreBoundary(s)).map((s) => crossAt(s, false));
  const coreLines = [crossAt(coreStart, true), crossAt(coreEnd, true)];

  return { bands, separators, coreLines };
};
