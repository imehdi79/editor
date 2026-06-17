/**
 * computeRoomAreas — detect enclosed rooms from the wall network and compute
 * each room's floor area (shoelace) in canvas px².
 *
 * The walls form a planar arrangement, not just an endpoint graph: a wall can
 * meet another wall in the middle (a T-junction / break point), two walls can
 * cross (+), and partition walls split a big room into smaller ones — exactly
 * what a real multi-room house looks like. So we:
 *
 *   1. take every wall centerline as a segment;
 *   2. split each segment at all points where another segment ends on it or
 *      crosses it (the arrangement vertices), so every junction is a real graph
 *      node — not a point floating in the middle of an edge;
 *   3. trace the minimal faces of the planar embedding with the standard
 *      "next half-edge = most-clockwise turn" rule, dropping the unbounded
 *      outer face. Each remaining face is a room.
 *
 * Doors and windows are openings hosted on a wall: the wall continues behind
 * them, so they never break a room boundary — hence only walls are considered.
 *
 * Pure: no React, no Konva, no store.
 */

import type { Shape } from "@/core/drawing-engine/drawing.types";
import { nodeKey } from "@/core/topology/computeTopology";

export interface RoomArea {
  /** Stable id derived from the room's node-key cycle */
  id: string;
  /** Floor area in canvas px² (centerline polygon) */
  areaPx: number;
  /** Polygon vertices in canvas space (centerline) */
  polygon: { x: number; y: number }[];
  /** Polygon centroid (label anchor) */
  centroid: { x: number; y: number };
}

type Pt = { x: number; y: number };
interface Seg {
  a: Pt;
  b: Pt;
}

const TWO_PI = Math.PI * 2;
const EPS = 1e-9;
/** A point within this many px of a segment is treated as lying on it (a touch
 *  / T-junction). Half the topology snap epsilon, so snapped joins always hit. */
const ON_SEG_TOL = 0.5;
/** Faces smaller than this (px²) are numerical slivers, not rooms. */
const MIN_AREA = 1;

/** Signed shoelace area in screen (y-down) space. */
const signedArea = (poly: Pt[]): number => {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
};

/**
 * Area-weighted polygon centroid. Used (instead of a plain vertex average) as
 * the label anchor because subdivision adds collinear vertices along edges,
 * which would drag a vertex average off-center.
 */
const polygonCentroid = (poly: Pt[]): Pt => {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const cross = p.x * q.y - q.x * p.y;
    a += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  if (Math.abs(a) < EPS) {
    // Degenerate ring — fall back to the vertex average.
    const n = poly.length || 1;
    return { x: poly.reduce((s, p) => s + p.x, 0) / n, y: poly.reduce((s, p) => s + p.y, 0) / n };
  }
  return { x: cx / (3 * a), y: cy / (3 * a) };
};

/** Interior-crossing intersection of two segments, or null if parallel / apart. */
const segIntersect = (s: Seg, t: Seg): Pt | null => {
  const rx = s.b.x - s.a.x;
  const ry = s.b.y - s.a.y;
  const dx = t.b.x - t.a.x;
  const dy = t.b.y - t.a.y;
  const denom = rx * dy - ry * dx;
  if (Math.abs(denom) < EPS) return null; // parallel / collinear — handled via endpoint-on-segment
  const qpx = t.a.x - s.a.x;
  const qpy = t.a.y - s.a.y;
  const ts = (qpx * dy - qpy * dx) / denom; // param along s
  const tt = (qpx * ry - qpy * rx) / denom; // param along t
  if (ts < -EPS || ts > 1 + EPS || tt < -EPS || tt > 1 + EPS) return null;
  return { x: s.a.x + ts * rx, y: s.a.y + ts * ry };
};

/** Parameter of p projected onto segment s, plus its perpendicular distance. */
const projParam = (p: Pt, s: Seg): { t: number; dist: number } => {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < EPS) return { t: 0, dist: Math.hypot(p.x - s.a.x, p.y - s.a.y) };
  const t = ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / len2;
  const cx = s.a.x + t * dx;
  const cy = s.a.y + t * dy;
  return { t, dist: Math.hypot(p.x - cx, p.y - cy) };
};

export const computeRoomAreas = (shapes: Record<string, Shape>): RoomArea[] => {
  // --- Wall centerlines as segments ---
  const segs: Seg[] = [];
  for (const s of Object.values(shapes)) {
    if (s.type !== "wall") continue;
    if (Math.hypot(s.x2 - s.x1, s.y2 - s.y1) < ON_SEG_TOL) continue;
    segs.push({ a: { x: s.x1, y: s.y1 }, b: { x: s.x2, y: s.y2 } });
  }
  if (segs.length < 3) return [];

  // --- Arrangement vertices: every endpoint + every interior crossing ---
  const points: Pt[] = [];
  for (const s of segs) points.push(s.a, s.b);
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const p = segIntersect(segs[i], segs[j]);
      if (p) points.push(p);
    }
  }

  // --- Subdivide each segment at the points lying on it → planar graph ---
  const pos = new Map<string, Pt>();
  const adj = new Map<string, Set<string>>();
  const ensure = (p: Pt): string => {
    const k = nodeKey(p.x, p.y);
    if (!pos.has(k)) {
      pos.set(k, p);
      adj.set(k, new Set());
    }
    return k;
  };
  const addEdge = (k1: string, k2: string) => {
    if (k1 === k2) return;
    adj.get(k1)!.add(k2);
    adj.get(k2)!.add(k1);
  };

  for (const seg of segs) {
    const on: { t: number; p: Pt }[] = [];
    const seen = new Set<string>();
    for (const p of points) {
      const { t, dist } = projParam(p, seg);
      if (dist <= ON_SEG_TOL && t >= -EPS && t <= 1 + EPS) {
        const k = nodeKey(p.x, p.y);
        if (!seen.has(k)) {
          seen.add(k);
          on.push({ t: Math.min(1, Math.max(0, t)), p });
        }
      }
    }
    on.sort((m, n) => m.t - n.t);
    for (let i = 0; i + 1 < on.length; i++) addEdge(ensure(on[i].p), ensure(on[i + 1].p));
  }
  if (pos.size < 3) return [];

  // --- Trace minimal faces ---
  const angle = (from: string, to: string): number => {
    const f = pos.get(from)!;
    const t = pos.get(to)!;
    return Math.atan2(t.y - f.y, t.x - f.x);
  };

  /**
   * Given a directed half-edge u→v, return the next half-edge v→w that hugs
   * the face: the neighbour of v whose direction is the smallest clockwise
   * rotation away from the reverse direction (v→u).
   */
  const nextNode = (u: string, v: string): string | null => {
    const back = angle(v, u);
    let best: string | null = null;
    let bestDelta = Infinity;
    for (const w of adj.get(v)!) {
      const a = angle(v, w);
      let delta = (back - a) % TWO_PI;
      if (delta <= 1e-9) delta += TWO_PI; // exclude the reverse edge itself (delta≈0)
      if (delta < bestDelta) {
        bestDelta = delta;
        best = w;
      }
    }
    return best;
  };

  const visited = new Set<string>(); // visited directed half-edges "u|v"
  const seenRooms = new Set<string>();
  const rooms: RoomArea[] = [];

  for (const start of adj.keys()) {
    for (const next of adj.get(start)!) {
      if (visited.has(`${start}|${next}`)) continue;

      const cycle: string[] = [];
      let u = start;
      let v = next;
      let guard = 0;
      let closed = false;
      while (guard++ < 10000) {
        visited.add(`${u}|${v}`);
        cycle.push(u);
        const w = nextNode(u, v);
        if (w === null) break;
        u = v;
        v = w;
        if (u === start && v === next) {
          closed = true;
          break;
        }
      }
      if (!closed || cycle.length < 3) continue;

      const poly = cycle.map((k) => pos.get(k)!);
      const area = signedArea(poly);

      // Interior faces wind POSITIVE under the most-clockwise rule in y-down
      // space; the unbounded outer face is negative. Keep interior faces only.
      if (area < MIN_AREA) continue;

      const id = [...cycle].sort().join("~");
      if (seenRooms.has(id)) continue;
      seenRooms.add(id);

      rooms.push({ id, areaPx: area, polygon: poly, centroid: polygonCentroid(poly) });
    }
  }

  return rooms;
};
