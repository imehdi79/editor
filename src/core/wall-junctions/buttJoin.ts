/**
 * buttJoin — node-level resolution for the "butt" join style.
 *
 * Unlike mitre/bevel/round (symmetric, resolved per wedge in joinStyles/), a
 * butt join is asymmetric: one wall runs THROUGH the node and the others butt
 * flush against its face. So it is resolved at the node, not the wedge.
 *
 * The "through" slab is the collinear pair at the node (a real T/cross), or —
 * when no pair exists (a plain L) — the dominant wall (thickest, then lowest id).
 * Through ends keep straight faces; abutting ends are clipped to the through
 * slab's near face. This is exactly how a butt T reads in construction: the
 * abutting wall stops dead at the continuous wall.
 */

import type { ClassifiedJunction, WallEnd } from "./junction.types";
import { intersectLines, type Vec2 } from "./geometry";

/** Collinearity tolerance (≈10°) — shared geometric truth with classifyJunction. */
const COLLINEAR_COS = 0.985;

const dot = (ax: number, ay: number, bx: number, by: number) => ax * bx + ay * by;
/** Left-hand normal of a direction. */
const perp = (dx: number, dy: number): Vec2 => ({ x: -dy, y: dx });
const endKey = (e: WallEnd) => `${e.wallId}:${e.handle}`;

/** The wall's canonical +n, derived from an end (sign depends on which end). */
const nCanonOf = (e: WallEnd): Vec2 => {
  const n = perp(e.dirX, e.dirY);
  return e.handle === "p1" ? n : { x: -n.x, y: -n.y };
};

/** Node shifted by the wall's eccentric offset — the origin for its faces. */
const offsetOrigin = (node: Vec2, e: WallEnd): Vec2 => {
  if (!e.offset) return node;
  const n = nCanonOf(e);
  return { x: node.x + n.x * e.offset, y: node.y + n.y * e.offset };
};

/** Split two corners into inner(+nWall) / outer(−nWall). */
const splitBySide = (c1: Vec2, c2: Vec2, node: Vec2, nWall: Vec2): { inner: Vec2; outer: Vec2 } => {
  const d1 = dot(c1.x - node.x, c1.y - node.y, nWall.x, nWall.y);
  const d2 = dot(c2.x - node.x, c2.y - node.y, nWall.x, nWall.y);
  return d1 >= d2 ? { inner: c1, outer: c2 } : { inner: c2, outer: c1 };
};

interface Host {
  dirX: number;
  dirY: number;
  half: number;
  /** World-space offset shift of the host centreline (eccentricity). */
  ox: number;
  oy: number;
  /** Layer build-up on the +hN / −hN face — abutting walls stop at the finish. */
  buildupPlus: number;
  buildupMinus: number;
}

const hostFromEnd = (rep: WallEnd, half: number, node: Vec2): Host => {
  const o = offsetOrigin(node, rep);
  // +hN side is the host's inner face when rep is its p1 end, else its outer.
  const plusIsInner = rep.handle === "p1";
  return {
    dirX: rep.dirX,
    dirY: rep.dirY,
    half,
    ox: o.x - node.x,
    oy: o.y - node.y,
    buildupPlus: plusIsInner ? rep.buildupInner : rep.buildupOuter,
    buildupMinus: plusIsInner ? rep.buildupOuter : rep.buildupInner,
  };
};

/** The through slab at the node + the set of ends that belong to it. */
const findHost = (ends: WallEnd[], node: Vec2): { host: Host; through: Set<string> } => {
  // Prefer the thickest collinear pair (a real through-wall).
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
    const rep = pair.a.thickness >= pair.b.thickness ? pair.a : pair.b;
    return {
      host: hostFromEnd(rep, Math.max(pair.a.thickness, pair.b.thickness) / 2, node),
      through: new Set([endKey(pair.a), endKey(pair.b)]),
    };
  }
  // No collinear pair (an L): the dominant wall runs through.
  const dom = [...ends].sort((x, y) => y.thickness - x.thickness || (x.wallId < y.wallId ? -1 : 1))[0];
  return { host: hostFromEnd(dom, dom.thickness / 2, node), through: new Set([endKey(dom)]) };
};

/** Inner/outer corners for one wall end under the butt join style. */
export const buttCornersForEnd = (
  junction: ClassifiedJunction,
  end: WallEnd,
  node: Vec2,
  nWall: Vec2,
): { inner: Vec2; outer: Vec2 } => {
  const half = end.thickness / 2;
  const { host, through } = findHost(junction.ends, node);
  const o = offsetOrigin(node, end);
  const sq1: Vec2 = { x: o.x + nWall.x * half, y: o.y + nWall.y * half };
  const sq2: Vec2 = { x: o.x - nWall.x * half, y: o.y - nWall.y * half };

  if (through.has(endKey(end))) {
    const hasPartner = junction.ends.some(
      (e) => endKey(e) !== endKey(end) && dot(e.dirX, e.dirY, end.dirX, end.dirY) <= -COLLINEAR_COS,
    );
    // A collinear partner makes a straight continuous slab → square at the node.
    if (hasPartner) return splitBySide(sq1, sq2, node, nWall);
    // Lone primary (L): extend outward to cover the abutting walls' footprint.
    const abutHalves = junction.ends.filter((e) => !through.has(endKey(e))).map((e) => e.thickness / 2);
    const cover = abutHalves.length ? Math.max(...abutHalves) : 0;
    const out: Vec2 = { x: -end.dirX, y: -end.dirY };
    return splitBySide(
      { x: sq1.x + out.x * cover, y: sq1.y + out.y * cover },
      { x: sq2.x + out.x * cover, y: sq2.y + out.y * cover },
      node,
      nWall,
    );
  }

  // Abutting end: clip both faces to the host slab's FINISHED near face — its
  // structural half plus any construction-layer build-up on the contact side —
  // so an abutting wall (and its own layers) stop at the host's finish, not its
  // bare structure (composite junction matching #19).
  const hN = perp(host.dirX, host.dirY);
  const side = dot(end.dirX, end.dirY, hN.x, hN.y) >= 0 ? 1 : -1;
  const finish = host.half + (side > 0 ? host.buildupPlus : host.buildupMinus);
  const faceX = node.x + host.ox + hN.x * finish * side;
  const faceY = node.y + host.oy + hN.y * finish * side;
  const nE = perp(end.dirX, end.dirY);
  const f1 = { x: o.x + nE.x * half, y: o.y + nE.y * half };
  const f2 = { x: o.x - nE.x * half, y: o.y - nE.y * half };
  const c1 = intersectLines(f1.x, f1.y, end.dirX, end.dirY, faceX, faceY, host.dirX, host.dirY) ?? f1;
  const c2 = intersectLines(f2.x, f2.y, end.dirX, end.dirY, faceX, faceY, host.dirX, host.dirY) ?? f2;
  return splitBySide(c1, c2, node, nWall);
};
