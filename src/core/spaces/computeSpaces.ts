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
 *     gross centreline area. Courtyard / atrium holes are inset the OTHER way
 *     (their finished faces eat into the room) and subtracted;
 *   • net area + net perimeter from that finished outline (holes included);
 *   • floor and ceiling surfaces — a flat space has one of each, both equal to
 *     the net floor area (the slab / soffit quantity, carried for takeoff and 3D).
 *
 * A space is a DERIVED runtime entity — never written into the document. Only the
 * assembly assignments keyed by {@link Space.id} persist; `withAssignments` folds
 * them back in WITHOUT re-tracing geometry (a cheap map over the cached result),
 * so changing an assembly never regenerates the geometry.
 *
 * Cached on the shapes object, so it recomputes whenever walls OR their layers
 * change (every store mutation yields a fresh shapes object). Pure — no React,
 * no Konva, no store.
 */

import type { Shape, WallShape } from "@/core/drawing-engine/drawing.types";
import { computeRoomAreas } from "@/core/drawing-info/computeRoomAreas";
import { finishBuildup } from "@/core/wall-layers/finishedWall";
import type { SpaceAssignments } from "./spaceAssignment";

type Pt = { x: number; y: number };

export interface SpaceSurface {
  kind: "floor" | "ceiling";
  /** Surface area in canvas px². */
  areaPx: number;
}

export interface Space {
  /** Stable id (shared with the underlying enclosed face). */
  id: string;
  /** Gross centreline outer polygon (label / hit-test anchor, fill outline). */
  polygon: Pt[];
  /** Gross centreline hole rings (courtyards / atria) — punched from the fill. */
  holes: Pt[][];
  /** Net (clear) floor polygon, inset to the bounding walls' finished faces. */
  netPolygon: Pt[];
  /** Polygon centroid (label anchor), hole-aware. */
  centroid: Pt;
  /** Gross area from the centreline loop, net of holes (px²). */
  grossAreaPx: number;
  /** Net (clear) floor area between finished faces, net of holes (px²). */
  netAreaPx: number;
  /** Net (clear) perimeter of the finished outline, holes included (px). */
  perimeterPx: number;
  /** Generated horizontal surfaces — floor + ceiling (flat ⇒ equal areas). */
  floor: SpaceSurface;
  ceiling: SpaceSurface;
  /** Optional display name (none today ⇒ callers number "Space N" by area rank). */
  name?: string;
  /** Persisted floor assembly id (filled by {@link withAssignments}). */
  floorAssemblyId?: string;
  /** Persisted ceiling assembly id (filled by {@link withAssignments}). */
  ceilingAssemblyId?: string;
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

/** Signed shoelace (winding sign) in y-down space. */
const signedArea = (poly: Pt[]): number => {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    s += p.x * q.y - q.x * p.y;
  }
  return s / 2;
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
 * carries the edge midpoint; `roomDir` is the unit direction pointing INTO the
 * room from the edge. Returns 0 when no wall hosts the edge (keep the edge).
 */
const edgeFinishOffset = (mid: Pt, roomDir: Pt, walls: WallShape[]): number => {
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
  const onPlus = roomDir.x * nx + roomDir.y * ny >= 0; // room sits on the wall's +n side
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
 * Offset a simple ring onto the bounding walls' finished room-side faces. The
 * room-side direction per edge is the winding-aware inward normal (robust for
 * concave / L-shaped rings) — flipped for holes, whose room side faces OUTWARD,
 * so a courtyard's finished walls grow the hole. Vertex j is the mitre of the two
 * adjacent offset lines; collinear neighbours fall back to a straight push.
 * Returns null if the result degenerates.
 */
const offsetRing = (poly: Pt[], walls: WallShape[], roomIsInterior: boolean): Pt[] | null => {
  const n = poly.length;
  if (n < 3) return null;
  const sgn = signedArea(poly) >= 0 ? 1 : -1;

  const roomDir: Pt[] = [];
  const dist: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const e = sub(b, a);
    const el = len(e) || 1;
    // Winding-aware inward normal (toward the ring's interior).
    let dir = { x: (-sgn * e.y) / el, y: (sgn * e.x) / el };
    if (!roomIsInterior) dir = { x: -dir.x, y: -dir.y }; // hole: room is outside
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    roomDir.push(dir);
    dist.push(edgeFinishOffset(mid, dir, walls));
  }

  const out: Pt[] = [];
  for (let j = 0; j < n; j++) {
    const i = (j - 1 + n) % n; // previous edge
    const a0 = poly[i];
    const b0 = poly[(i + 1) % n];
    const a1 = poly[j];
    const b1 = poly[(j + 1) % n];
    const pPrev = { x: a0.x + roomDir[i].x * dist[i], y: a0.y + roomDir[i].y * dist[i] };
    const pCur = { x: a1.x + roomDir[j].x * dist[j], y: a1.y + roomDir[j].y * dist[j] };
    const hit = lineIntersect(pPrev, sub(b0, a0), pCur, sub(b1, a1));
    out.push(hit ?? { x: poly[j].x + roomDir[j].x * dist[j], y: poly[j].y + roomDir[j].y * dist[j] });
  }
  return out;
};

const computeSpacesUncached = (shapes: Record<string, Shape>): Space[] => {
  const rooms = computeRoomAreas(shapes); // proven enclosure trace, largest-first
  if (rooms.length === 0) return [];

  const walls = Object.values(shapes).filter((s): s is WallShape => s.type === "wall");

  return rooms.map((room): Space => {
    const grossArea = room.areaPx; // centreline area, net of holes
    const grossPerimeter = perimeter(room.polygon) + room.holes.reduce((s, h) => s + perimeter(h), 0);

    let netPolygon = room.polygon;
    let netAreaPx = grossArea;
    let perimeterPx = grossPerimeter;

    const finishedOuter = offsetRing(room.polygon, walls, true);
    if (finishedOuter) {
      const finishedHoles = room.holes.map((h) => offsetRing(h, walls, false));
      const holeArea = finishedHoles.reduce((s, h) => s + (h ? shoelace(h) : 0), 0);
      const net = shoelace(finishedOuter) - holeArea;
      // Keep the finished outline only when it's a sane shrink of the gross floor;
      // a collapsed/inverted result (walls thicker than the room) falls back to gross.
      if (net > EPS && net <= grossArea + EPS) {
        netPolygon = finishedOuter;
        netAreaPx = net;
        perimeterPx =
          perimeter(finishedOuter) + finishedHoles.reduce((s, h) => s + (h ? perimeter(h) : 0), 0);
      }
    }

    return {
      id: room.id,
      polygon: room.polygon,
      holes: room.holes,
      netPolygon,
      centroid: room.centroid,
      grossAreaPx: grossArea,
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

/**
 * Fold persisted assembly assignments onto the (cached) geometry spaces — a cheap
 * map that NEVER re-traces geometry, so changing an assignment doesn't regenerate
 * the rooms. Returns a new array; unassigned spaces pass through untouched.
 */
export const withAssignments = (spaces: readonly Space[], assignments: SpaceAssignments): Space[] =>
  spaces.map((sp) => {
    const a = assignments[sp.id];
    if (!a) return sp;
    return { ...sp, floorAssemblyId: a.floorAssemblyId, ceilingAssemblyId: a.ceilingAssemblyId, name: a.name };
  });
