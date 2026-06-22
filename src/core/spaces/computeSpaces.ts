/**
 * computeSpaces — enclosed-space detection on top of the wall network.
 *
 * A "space" is an enclosed area bounded by walls (Revit/IFC sense: a room with a
 * floor and a ceiling). The enclosure tracing is the proven planar-face trace in
 * `computeRoomAreas` (reused, not duplicated); this layer enriches every face
 * with the construction quantities a takeoff needs:
 *
 *   • net (clear) floor polygon — the centreline loop inset to each bounding
 *     wall's FINISHED room-side face (core half + that side's finish build-up,
 *     plus the wall's eccentric offset), so the area is the usable floor, not the
 *     gross centreline area;
 *   • net area + net perimeter from that inset polygon;
 *   • floor and ceiling surfaces — a flat space has one of each, both equal to
 *     the net floor area (the slab / soffit quantity, carried for takeoff and
 *     future 3D).
 *
 * Cached on the shapes object, so it recomputes whenever walls OR their layers
 * change (every store mutation yields a fresh shapes object). Pure — no React,
 * no Konva, no store.
 */

import type { Shape, WallShape } from "@/core/drawing-engine/drawing.types";
import { computeRoomAreas } from "@/core/drawing-info/computeRoomAreas";
import { finishBuildup } from "@/core/wall-layers/finishedWall";

type Pt = { x: number; y: number };

export interface SpaceSurface {
  kind: "floor" | "ceiling";
  /** Surface area in canvas px². */
  areaPx: number;
}

export interface Space {
  /** Stable id (shared with the underlying enclosed face). */
  id: string;
  /** Gross centreline polygon (label / hit-test anchor). */
  polygon: Pt[];
  /** Net (clear) floor polygon, inset to the bounding walls' finished faces. */
  netPolygon: Pt[];
  /** Polygon centroid (label anchor). */
  centroid: Pt;
  /** Gross area from the centreline loop (px²). */
  grossAreaPx: number;
  /** Net (clear) floor area between finished faces (px²). */
  netAreaPx: number;
  /** Net (clear) perimeter of the finished-face polygon (px). */
  perimeterPx: number;
  /** Generated horizontal surfaces — floor + ceiling (flat ⇒ equal areas). */
  floor: SpaceSurface;
  ceiling: SpaceSurface;
}

const EPS = 1e-9;
/** A point within this many px of a wall centreline counts as lying on it. */
const ON_WALL_TOL = 0.75;

const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const len = (a: Pt): number => Math.hypot(a.x, a.y);

const shoelace = (poly: Pt[]): number => {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    s += p.x * q.y - q.x * p.y;
  }
  return Math.abs(s) / 2;
};

const perimeter = (poly: Pt[]): number => {
  let s = 0;
  for (let i = 0; i < poly.length; i++) s += len(sub(poly[(i + 1) % poly.length], poly[i]));
  return s;
};

/** Distance of point p from segment [a,b] (∞ when projection falls off the ends). */
const distOnSegment = (p: Pt, a: Pt, b: Pt): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 < EPS) return Infinity;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  if (t < -EPS || t > 1 + EPS) return Infinity;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

/**
 * Inward perpendicular offset (px) to apply to a polygon EDGE so it lands on the
 * bounding wall's finished room-side face. The wall is the one whose centreline
 * carries the edge midpoint; the room side is decided by the edge's inward
 * normal vs the wall's +n. Returns 0 when no wall hosts the edge (keep the edge).
 */
const edgeFinishOffset = (mid: Pt, inward: Pt, walls: WallShape[]): number => {
  let host: WallShape | null = null;
  let bestDist = ON_WALL_TOL;
  for (const w of walls) {
    const d = distOnSegment(mid, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
    // Prefer the closest centreline; tie-break toward the thicker (dominant) wall.
    if (d < bestDist - EPS || (Math.abs(d - bestDist) < EPS && host && w.thickness > host.thickness)) {
      bestDist = d;
      host = w;
    }
  }
  if (!host) return 0;

  const wlen = Math.hypot(host.x2 - host.x1, host.y2 - host.y1) || 1;
  const nx = -(host.y2 - host.y1) / wlen; // wall +n (left-hand normal)
  const ny = (host.x2 - host.x1) / wlen;
  const onPlus = inward.x * nx + inward.y * ny >= 0; // room sits on the wall's +n side
  const fb = finishBuildup(host);
  const finish = onPlus ? fb.inner : fb.outer;
  const offset = host.offset ?? 0;
  // Centreline → finished room-side face: core half + that side's finish, shifted
  // by the eccentric body offset (+offset moves the +n face out, the −n face in).
  return host.thickness / 2 + finish + (onPlus ? offset : -offset);
};

/** Intersect line A (pA, dirA) with line B (pB, dirB); null when ~parallel. */
const lineIntersect = (pA: Pt, dA: Pt, pB: Pt, dB: Pt): Pt | null => {
  const denom = dA.x * dB.y - dA.y * dB.x;
  if (Math.abs(denom) < 1e-7) return null;
  const t = ((pB.x - pA.x) * dB.y - (pB.y - pA.y) * dB.x) / denom;
  return { x: pA.x + t * dA.x, y: pA.y + t * dA.y };
};

/**
 * Inset a simple polygon by a per-edge inward distance. Vertex j is the meeting
 * of the offset lines of edge j-1 and edge j (a mitre); collinear neighbours
 * (subdivision points) fall back to a straight push-in. Returns null if the
 * result degenerates (room narrower than its walls).
 */
const insetPolygon = (poly: Pt[], centroid: Pt, walls: WallShape[]): Pt[] | null => {
  const n = poly.length;
  if (n < 3) return null;

  // Per-edge inward unit normal + finished offset.
  const normal: Pt[] = [];
  const dist: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const e = sub(b, a);
    const el = len(e) || 1;
    let nin = { x: -e.y / el, y: e.x / el };
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (nin.x * (centroid.x - mid.x) + nin.y * (centroid.y - mid.y) < 0) nin = { x: -nin.x, y: -nin.y };
    normal.push(nin);
    dist.push(edgeFinishOffset(mid, nin, walls));
  }

  const out: Pt[] = [];
  for (let j = 0; j < n; j++) {
    const i = (j - 1 + n) % n; // previous edge
    const a0 = poly[i];
    const b0 = poly[(i + 1) % n];
    const a1 = poly[j];
    const b1 = poly[(j + 1) % n];
    const pPrev = { x: a0.x + normal[i].x * dist[i], y: a0.y + normal[i].y * dist[i] };
    const pCur = { x: a1.x + normal[j].x * dist[j], y: a1.y + normal[j].y * dist[j] };
    const hit = lineIntersect(pPrev, sub(b0, a0), pCur, sub(b1, a1));
    out.push(hit ?? { x: poly[j].x + normal[j].x * dist[j], y: poly[j].y + normal[j].y * dist[j] });
  }
  return out;
};

const computeSpacesUncached = (shapes: Record<string, Shape>): Space[] => {
  const rooms = computeRoomAreas(shapes); // proven enclosure trace, largest-first
  if (rooms.length === 0) return [];

  const walls = Object.values(shapes).filter((s): s is WallShape => s.type === "wall");

  return rooms.map((room): Space => {
    const gross = room.areaPx;
    const inset = insetPolygon(room.polygon, room.centroid, walls);
    let netPolygon = room.polygon;
    let netAreaPx = gross;
    let perimeterPx = perimeter(room.polygon);
    if (inset) {
      const a = shoelace(inset);
      // Keep the inset only when it is a sane shrink of the gross floor; a
      // collapsed/inverted inset (walls thicker than the room) falls back to gross.
      if (a > EPS && a <= gross + EPS) {
        netPolygon = inset;
        netAreaPx = a;
        perimeterPx = perimeter(inset);
      }
    }

    return {
      id: room.id,
      polygon: room.polygon,
      netPolygon,
      centroid: room.centroid,
      grossAreaPx: gross,
      netAreaPx,
      perimeterPx,
      floor: { kind: "floor", areaPx: netAreaPx },
      ceiling: { kind: "ceiling", areaPx: netAreaPx },
    };
  });
};

const cache = new WeakMap<Record<string, Shape>, Space[]>();

/**
 * Cached entry point. Enclosure tracing + per-edge inset is O(rooms × edges);
 * several consumers (SpaceRenderer, the takeoff) share one result per shapes
 * version. The returned array is shared, pre-sorted (largest first) — read-only.
 */
export const computeSpaces = (shapes: Record<string, Shape>): Space[] => {
  const hit = cache.get(shapes);
  if (hit) return hit;
  const spaces = computeSpacesUncached(shapes);
  cache.set(shapes, spaces);
  return spaces;
};
