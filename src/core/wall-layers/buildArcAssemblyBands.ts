/**
 * buildArcAssemblyBands — canvas geometry for a CURVED wall's BIM composite
 * assembly. The arc analogue of buildWallAssemblyBands: every layer of
 * `wallAssembly` becomes a filled ring-segment band that follows the arc between
 * its two concentric faces, with both ends cut along the wall body's resolved
 * junction corner lines (so an arc mitres/butts cleanly into its neighbours,
 * exactly like a straight wall). Internal boundaries become thin separators; the
 * two core boundaries become heavier lines — the same professional CAD read.
 *
 * The end-cut lines come from the structural outline corners (p1Inner→p1Outer,
 * p2Inner→p2Outer), resolved by the junction system. Each end works in its OWN
 * local frame (the arc tangent + the radial normal at that endpoint), so the
 * layers meet the joint at the true tangent-mitre angle. Finish layers can pull
 * back per end (setback) so they die into an abutting host's finished face.
 *
 * Pure — no React, no Konva, no store.
 */

import type { ArcWallShape } from "@/core/drawing-engine/drawing.types";
import { intersectLines, type WallOutline, type Vec2 } from "@/core/wall-junctions";
import { arcInteriorPoints, arcTangentAtEnd } from "@/core/arc/arcGeometry";
import { materialColor } from "./wallLayers";
import { wallAssembly } from "./wallAssembly";
import type { AssemblyBands } from "./buildWallAssemblyBands";

/** Sampling resolution of the curved faces (matches the structural outline). */
const ARC_BAND_SEGMENTS = 48;

interface CutLine {
  ox: number;
  oy: number;
  dx: number;
  dy: number;
}

/** Unit left-hand normal of a direction. */
const perp = (x: number, y: number): Vec2 => ({ x: -y, y: x });

/**
 * @param setback  Per-end FINISH-band pull-back (px) for butt-junction layer
 *   cleanup (finishSetbacksForWall). The structural core keeps the structural
 *   cut; only finish bands at that end stop `setback` short, so the abutting
 *   wall's finishes meet the host's finished surface. 0 = layers continue.
 */
export const buildArcAssemblyBands = (
  wall: ArcWallShape,
  outline: WallOutline,
  setback?: { p1: number; p2: number },
): AssemblyBands => {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const clen = Math.hypot(dx, dy) || 1;
  // Chord left-hand normal — the stable +n reference (inner = +n, outer = −n).
  const nWall: Vec2 = { x: -dy / clen, y: dx / clen };
  const off = wall.offset ?? 0;
  // +radial = away from centre; +n maps to +radial via sign(bulge).
  const sgn = wall.bulge >= 0 ? 1 : -1;

  // Per-end frames: the arc tangent (away from the node) + the radial normal,
  // oriented to +n so a positive offset is always the inner face.
  const t1 = arcTangentAtEnd(wall.x1, wall.y1, wall.x2, wall.y2, wall.bulge, "p1");
  const t2 = arcTangentAtEnd(wall.x1, wall.y1, wall.x2, wall.y2, wall.bulge, "p2");
  const orient = (n: Vec2): Vec2 => (n.x * nWall.x + n.y * nWall.y >= 0 ? n : { x: -n.x, y: -n.y });
  const n1 = orient(perp(t1.x, t1.y));
  const n2 = orient(perp(t2.x, t2.y));

  // End-cut lines through each end's inner & outer outline corners (structural).
  const cut1: CutLine = { ox: outline.p1Inner.x, oy: outline.p1Inner.y, dx: outline.p1Outer.x - outline.p1Inner.x, dy: outline.p1Outer.y - outline.p1Inner.y };
  const cut2: CutLine = { ox: outline.p2Inner.x, oy: outline.p2Inner.y, dx: outline.p2Outer.x - outline.p2Inner.x, dy: outline.p2Outer.y - outline.p2Inner.y };

  // Finish cut = structural cut slid toward the interior (along the local tangent)
  // by the per-end setback. 0 ⇒ identical to the structural cut.
  const sb1 = setback?.p1 ?? 0;
  const sb2 = setback?.p2 ?? 0;
  const cut1F: CutLine = { ...cut1, ox: cut1.ox + t1.x * sb1, oy: cut1.oy + t1.y * sb1 };
  const cut2F: CutLine = { ...cut2, ox: cut2.ox + t2.x * sb2, oy: cut2.oy + t2.y * sb2 };

  /** Face point at one end: the +n offset line (in the end's local frame) cut by
   *  that end's cut line — same construction as the straight band builder. */
  const endPoint = (s: number, node: Vec2, n: Vec2, axis: Vec2, cut: CutLine): Vec2 => {
    const t = off + s;
    const lx = node.x + n.x * t;
    const ly = node.y + n.y * t;
    return intersectLines(lx, ly, axis.x, axis.y, cut.ox, cut.oy, cut.dx, cut.dy) ?? { x: lx, y: ly };
  };
  const p1 = { x: wall.x1, y: wall.y1 };
  const p2 = { x: wall.x2, y: wall.y2 };

  /** A full face polyline at signed offset `s`, p1→p2, cut to the core/finish
   *  faces. The curved middle is sampled; the two ends are the resolved corners. */
  const facePolyline = (s: number, isCore: boolean): Vec2[] => {
    const a = endPoint(s, p1, n1, t1, isCore ? cut1 : cut1F);
    const b = endPoint(s, p2, n2, t2, isCore ? cut2 : cut2F);
    const mid = arcInteriorPoints(wall.x1, wall.y1, wall.x2, wall.y2, wall.bulge, ARC_BAND_SEGMENTS, (off + s) * sgn);
    return [a, ...mid, b];
  };
  const flat = (pts: Vec2[]): number[] => pts.flatMap((p) => [p.x, p.y]);

  const { layers, coreStart, coreEnd } = wallAssembly(wall);

  const bands = layers.map((l) => {
    const start = facePolyline(l.start, l.isCore); // p1→p2 at the outer offset
    const end = facePolyline(l.end, l.isCore).reverse(); // p2→p1 at the inner offset
    return {
      polygon: flat([...start, ...end]),
      material: l.material,
      color: l.material ? materialColor(l.material) : "",
      isCore: l.isCore,
    };
  });

  const EPS = 1e-6;
  const boundaries = layers.length > 0 ? [layers[0].start, ...layers.map((l) => l.end)] : [];
  const isCoreBoundary = (s: number) => Math.abs(s - coreStart) < EPS || Math.abs(s - coreEnd) < EPS;
  const separators = boundaries.filter((s) => !isCoreBoundary(s)).map((s) => flat(facePolyline(s, false)));
  const coreLines = [flat(facePolyline(coreStart, true)), flat(facePolyline(coreEnd, true))];

  return { bands, separators, coreLines };
};
