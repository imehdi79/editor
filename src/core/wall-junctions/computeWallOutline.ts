/**
 * computeWallOutline — the solid body polygon for every wall, with its ends
 * resolved against the junctions it participates in.
 *
 * Each wall body is a quad [p1Inner, p2Inner, p2Outer, p1Outer]. At a free end
 * the two corners are the square face points; at an L/T/X/star node the corner
 * is the join vertex produced by the configured JoinResolver (mitre by default).
 * "Inner" is the +n face (n = left-hand normal of p1→p2), "outer" the −n face —
 * matching the side convention used by wallLayers and the dimension layer.
 *
 * Depends on `config` (join style), so results are cached per (shapes, config).
 *
 * Pure — no React, no Konva, no store.
 */

import type { Shape, ShapeId, WallShape } from "@/core/drawing-engine/drawing.types";
import { nodeKey } from "@/core/topology/computeTopology";
import { computeWallJunctions } from "./computeWallJunctions";
import { getJoinResolver } from "./joinStyles";
import { getEndCap } from "./endCaps";
import { buttCornersForEnd } from "./buttJoin";
import type { Vec2 } from "./geometry";
import type { ClassifiedJunction, JunctionConfig, Wedge, WallEnd } from "./junction.types";

export interface WallOutline {
  wallId: ShapeId;
  /** Closed body polygon (canvas space). */
  polygon: Vec2[];
  /** Inner-face (+n) corners at each end. */
  p1Inner: Vec2;
  p2Inner: Vec2;
  /** Outer-face (−n) corners at each end. */
  p1Outer: Vec2;
  p2Outer: Vec2;
}

/** Map from wall id → its resolved outline. */
export type WallOutlineMap = Map<ShapeId, WallOutline>;

const dot = (ax: number, ay: number, bx: number, by: number) => ax * bx + ay * by;

/** CCW-side perpendicular of a direction (bearing frame): (dy, −dx). */
const pccw = (dx: number, dy: number): Vec2 => ({ x: dy, y: -dx });
/** CW-side perpendicular of a direction: (−dy, dx). */
const pcw = (dx: number, dy: number): Vec2 => ({ x: -dy, y: dx });

/** The wedge between angularly-adjacent ends `cw` (a-side) and `ccw` (b-side). */
const wedgeBetween = (node: Vec2, cw: WallEnd, ccw: WallEnd, miterLimit: number): Wedge => {
  const a = pccw(cw.dirX, cw.dirY); // cw end's face that faces the wedge (its CCW side)
  const b = pcw(ccw.dirX, ccw.dirY); // ccw end's face that faces the wedge (its CW side)
  let angle = ccw.bearing - cw.bearing;
  if (angle <= 0) angle += 360;
  return {
    nodeX: node.x,
    nodeY: node.y,
    a: { x: node.x + a.x * (cw.thickness / 2), y: node.y + a.y * (cw.thickness / 2), dx: cw.dirX, dy: cw.dirY },
    b: { x: node.x + b.x * (ccw.thickness / 2), y: node.y + b.y * (ccw.thickness / 2), dx: ccw.dirX, dy: ccw.dirY },
    angleDeg: angle,
    miterLimit,
  };
};

/** Both face corners (split by side) for one wall end at a junction node. */
const cornersAtEnd = (
  junction: ClassifiedJunction | null,
  end: WallEnd,
  node: Vec2,
  nWall: Vec2,
  config: JunctionConfig,
): { inner: Vec2; outer: Vec2 } => {
  const n = pcw(end.dirX, end.dirY); // either ±nWall — symmetric butt corners
  const half = end.thickness / 2;
  const butt1: Vec2 = { x: node.x + n.x * half, y: node.y + n.y * half };
  const butt2: Vec2 = { x: node.x - n.x * half, y: node.y - n.y * half };

  if (!junction || junction.ends.length < 2) {
    return splitBySide(butt1, butt2, node, nWall);
  }

  // Butt is asymmetric (one wall runs through, others clip to its face), so it is
  // resolved at the node, not via the symmetric per-wedge registry.
  if (config.joinStyle === "butt") {
    return buttCornersForEnd(junction, end, node, nWall);
  }

  const ends = junction.ends;
  const i = ends.findIndex((e) => e.wallId === end.wallId && e.handle === end.handle);
  if (i < 0) return splitBySide(butt1, butt2, node, nWall);

  const ccwNeighbor = ends[(i + 1) % ends.length];
  const cwNeighbor = ends[(i - 1 + ends.length) % ends.length];
  const resolve = getJoinResolver(config.joinStyle);

  // CCW corner: this end is the a-side of the wedge with its CCW neighbour.
  const ccwWedge = wedgeBetween(node, end, ccwNeighbor, config.miterLimit);
  const ccwRes = resolve(ccwWedge).vertices;
  const ccwCorner = sane(ccwRes[0], { x: ccwWedge.a.x, y: ccwWedge.a.y }, node, end.thickness);

  // CW corner: this end is the b-side of the wedge with its CW neighbour.
  const cwWedge = wedgeBetween(node, cwNeighbor, end, config.miterLimit);
  const cwRes = resolve(cwWedge).vertices;
  const cwCorner = sane(cwRes[cwRes.length - 1], { x: cwWedge.b.x, y: cwWedge.b.y }, node, end.thickness);

  return splitBySide(ccwCorner, cwCorner, node, nWall);
};

/**
 * Hard safety net for multi-way (X/star) and overlapping-wall nodes: a
 * near-degenerate wedge (two walls almost coincident) makes the mitre apex shoot
 * to infinity. Beyond this many half-thicknesses the corner is meaningless, so
 * fall back to the square face point. This is distinct from the user's miter
 * limit (wj-8), which turns long-but-finite spikes into bevels.
 */
const SPIKE_CAP = 1000;
const sane = (corner: Vec2 | undefined, fallback: Vec2, node: Vec2, thickness: number): Vec2 => {
  if (!corner || !Number.isFinite(corner.x) || !Number.isFinite(corner.y)) return fallback;
  if (Math.hypot(corner.x - node.x, corner.y - node.y) > thickness * SPIKE_CAP) return fallback;
  return corner;
};

/**
 * Assign two corners to inner (+nWall) / outer (−nWall). nWall is the wall's own
 * left-hand normal, so inner/outer stay on the same physical face at BOTH ends
 * (using each end's away-direction would flip the labelling at p2 and twist the
 * quad).
 */
const splitBySide = (c1: Vec2, c2: Vec2, node: Vec2, nWall: Vec2): { inner: Vec2; outer: Vec2 } => {
  const d1 = dot(c1.x - node.x, c1.y - node.y, nWall.x, nWall.y);
  const d2 = dot(c2.x - node.x, c2.y - node.y, nWall.x, nWall.y);
  return d1 >= d2 ? { inner: c1, outer: c2 } : { inner: c2, outer: c1 };
};

const buildOutline = (wall: WallShape, shapes: Record<string, Shape>, config: JunctionConfig): WallOutline | null => {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null; // degenerate wall

  const junctions = computeWallJunctions(shapes);
  // Wall's own left-hand normal — the stable inner(+n)/outer(−n) reference.
  const nWall: Vec2 = { x: -dy / len, y: dx / len };

  const end1: WallEnd = { wallId: wall.id, handle: "p1", thickness: wall.thickness, dirX: dx / len, dirY: dy / len, bearing: 0 };
  const end2: WallEnd = { wallId: wall.id, handle: "p2", thickness: wall.thickness, dirX: -dx / len, dirY: -dy / len, bearing: 0 };

  const j1 = junctions.get(nodeKey(wall.x1, wall.y1)) ?? null;
  const j2 = junctions.get(nodeKey(wall.x2, wall.y2)) ?? null;

  // Use the classified ends (they carry the correct bearings); fall back to ours.
  const e1 = j1?.ends.find((e) => e.wallId === wall.id && e.handle === "p1") ?? end1;
  const e2 = j2?.ends.find((e) => e.wallId === wall.id && e.handle === "p2") ?? end2;

  const c1 = cornersAtEnd(j1, e1, { x: wall.x1, y: wall.y1 }, nWall, config);
  const c2 = cornersAtEnd(j2, e2, { x: wall.x2, y: wall.y2 }, nWall, config);

  // Free ends get the configured cap (butt/round/square); joined ends keep their
  // mitre cut. The corner fields stay the face points (dimensions/bands measure
  // from them); only the rendered body polygon carries the cap.
  const half = wall.thickness / 2;
  const ux = dx / len;
  const uy = dy / len;
  const free1 = !j1 || j1.ends.length < 2;
  const free2 = !j2 || j2.ends.length < 2;
  const cap = getEndCap(config.endCap);
  const cap1 = free1 ? cap(c1.outer, c1.inner, { x: -ux, y: -uy }, half) : [c1.outer, c1.inner];
  const cap2 = free2 ? cap(c2.inner, c2.outer, { x: ux, y: uy }, half) : [c2.inner, c2.outer];

  return {
    wallId: wall.id,
    p1Inner: c1.inner,
    p1Outer: c1.outer,
    p2Inner: c2.inner,
    p2Outer: c2.outer,
    polygon: [...cap1, ...cap2],
  };
};

/**
 * Node patches: when a wedge resolves to a chamfer (bevel) or fillet (round) the
 * two wall bodies end square, leaving a gap. A patch [node, ...joinVertices]
 * fills it so the corner reads as one solid. Mitre apexes (single vertex) need
 * no patch — both bodies already reach them. Butt joins clip/extend instead, so
 * they emit no patches.
 */
const buildPatches = (shapes: Record<string, Shape>, config: JunctionConfig): Vec2[][] => {
  if (config.joinStyle === "butt") return [];
  const junctions = computeWallJunctions(shapes);
  const resolve = getJoinResolver(config.joinStyle);
  const patches: Vec2[][] = [];
  for (const j of junctions.values()) {
    if (j.ends.length < 2) continue;
    const node: Vec2 = { x: j.x, y: j.y };
    for (let i = 0; i < j.ends.length; i++) {
      const wedge = wedgeBetween(node, j.ends[i], j.ends[(i + 1) % j.ends.length], config.miterLimit);
      const verts = resolve(wedge).vertices;
      if (verts.length >= 2) patches.push([node, ...verts]);
    }
  }
  return patches;
};

// --- Cache: keyed by shapes, invalidated when the config fields change ---------

interface OutlineData {
  outlines: WallOutlineMap;
  patches: Vec2[][];
}

interface CacheEntry extends OutlineData {
  config: JunctionConfig;
}

const sameConfig = (a: JunctionConfig, b: JunctionConfig): boolean =>
  a.joinStyle === b.joinStyle && a.miterLimit === b.miterLimit && a.endCap === b.endCap && a.align === b.align;

const cache = new WeakMap<Record<string, Shape>, CacheEntry>();

const outlineData = (shapes: Record<string, Shape>, config: JunctionConfig): OutlineData => {
  const hit = cache.get(shapes);
  if (hit && sameConfig(hit.config, config)) return hit;

  const outlines: WallOutlineMap = new Map();
  for (const shape of Object.values(shapes)) {
    if (shape.type !== "wall") continue;
    const outline = buildOutline(shape, shapes, config);
    if (outline) outlines.set(shape.id, outline);
  }
  const patches = buildPatches(shapes, config);
  cache.set(shapes, { config: { ...config }, outlines, patches });
  return { outlines, patches };
};

/** Resolved wall body outlines for the floor plan. Cached per (shapes, config). */
export const computeWallOutlines = (shapes: Record<string, Shape>, config: JunctionConfig): WallOutlineMap =>
  outlineData(shapes, config).outlines;

/** Corner fill patches (chamfers / fillets) for bevel & round joins. */
export const computeJunctionPatches = (shapes: Record<string, Shape>, config: JunctionConfig): Vec2[][] =>
  outlineData(shapes, config).patches;
