/**
 * computeRoomAreas — detect enclosed rooms from the wall network and compute
 * each room's floor area (shoelace) in canvas px².
 *
 * Approach: treat wall centerlines as edges of a planar graph whose vertices
 * are shared topology nodes. Trace the minimal faces of the planar embedding
 * with the standard "next half-edge = most-clockwise turn" rule, then discard
 * the single unbounded (outer) face. Each remaining face is a room.
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

const TWO_PI = Math.PI * 2;

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

const centroidOf = (poly: Pt[]): Pt => {
  let cx = 0;
  let cy = 0;
  for (const p of poly) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / poly.length, y: cy / poly.length };
};

export const computeRoomAreas = (shapes: Record<string, Shape>): RoomArea[] => {
  // --- Build the planar graph from wall centerlines ---
  const pos = new Map<string, Pt>();
  const adj = new Map<string, Set<string>>();

  const addNode = (x: number, y: number): string => {
    const k = nodeKey(x, y);
    if (!pos.has(k)) {
      pos.set(k, { x, y });
      adj.set(k, new Set());
    }
    return k;
  };

  for (const s of Object.values(shapes)) {
    if (s.type !== "wall") continue;
    const a = addNode(s.x1, s.y1);
    const b = addNode(s.x2, s.y2);
    if (a === b) continue;
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  }

  if (pos.size < 3) return [];

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
  const rooms: RoomArea[] = [];

  for (const start of adj.keys()) {
    for (const next of adj.get(start)!) {
      const heKey = `${start}|${next}`;
      if (visited.has(heKey)) continue;

      // Trace the face starting with start→next
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

      // The unbounded outer face has the opposite winding to interior rooms.
      // With the most-clockwise next rule in y-down space, interior faces come
      // out with POSITIVE signed area; the outer face is negative. Keep only
      // interior faces.
      if (area <= 0) continue;

      rooms.push({
        id: [...cycle].sort().join("~"),
        areaPx: area,
        polygon: poly,
        centroid: centroidOf(poly),
      });
    }
  }

  return rooms;
};
