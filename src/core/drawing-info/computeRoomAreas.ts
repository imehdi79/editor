/**
 * computeRoomAreas — detect enclosed rooms from the wall network and compute
 * each room's floor area (shoelace) in canvas px².
 *
 * The walls form a planar arrangement, not just an endpoint graph: a wall can
 * meet another wall in the middle (a T-junction / break point), two walls can
 * cross (+), and partition walls split a big room into smaller ones — exactly
 * what a real multi-room house looks like. So we:
 *
 *   1. take every wall centerline as a segment (arc walls sampled into facets),
 *      each TAGGED with its owning wall shape-id;
 *   2. split each segment at all points where another segment ends on it or
 *      crosses it (the arrangement vertices), so every junction is a real graph
 *      node — sub-edges inherit their parent segment's wall id;
 *   3. trace EVERY minimal face of the planar embedding with the standard
 *      "next half-edge = most-clockwise turn" rule. Faces wind positive (interior)
 *      or negative (the outer / hole boundaries) in y-down space.
 *   4. classify: positive faces are rooms; a negative ring contained inside a room
 *      is a HOLE (courtyard / atrium) whose area is subtracted, so a donut-shaped
 *      room reports its true floor. Negatives contained in no room are the
 *      unbounded exterior and are discarded.
 *
 * Each room's id is the sorted set of bounding wall shape-ids (outer ring + any
 * holes), so it stays stable while the bounding walls only move/resize and only
 * changes when the bounding SET changes (a wall added/removed, a room split or
 * merged). This is what lets persisted per-space assignments survive edits.
 *
 * Doors and windows are openings hosted on a wall: the wall continues behind
 * them, so they never break a room boundary — hence only walls are considered.
 * Arc walls bound a room along their CURVE, so each one is sampled into a
 * centreline polyline (a flat chord would mis-cut the floor area).
 *
 * Pure: no React, no Konva, no store.
 */

import type { ArcWallShape, Shape } from "@/core/drawing-engine/drawing.types";
import { nodeKey } from "@/core/topology/computeTopology";
import { arcFromChordBulge, arcPolyline } from "@/core/arc/arcGeometry";

type Pt = { x: number; y: number };

export interface RoomArea {
  /** Stable id: sorted set of bounding wall shape-ids (outer ring + holes). */
  id: string;
  /** Floor area in canvas px² (centerline polygon, NET of any holes). */
  areaPx: number;
  /** Outer-boundary polygon vertices in canvas space (centerline). */
  polygon: Pt[];
  /** Inner hole rings (courtyards / atria) subtracted from the area; [] when none. */
  holes: Pt[][];
  /** Hole-aware polygon centroid (label anchor). */
  centroid: Pt;
}

interface Seg {
  a: Pt;
  b: Pt;
  /** Owning wall shape-id (provenance for the stable room id). */
  wallId: string;
}

const TWO_PI = Math.PI * 2;
const EPS = 1e-9;
/** A point within this many px of a segment is treated as lying on it (a touch
 *  / T-junction). Half the topology snap epsilon, so snapped joins always hit. */
const ON_SEG_TOL = 0.5;
/** Faces smaller than this (px²) are numerical slivers, not rooms. */
const MIN_AREA = 1;
/** Arc-wall centreline facet density: one chord per ~11° of sweep, clamped so a
 *  shallow arc still gets a few facets and a deep sweep doesn't flood the O(n²)
 *  arrangement. The polyline inscribes the true curve, so the traced face hugs it. */
const ARC_SEG_RAD = Math.PI / 16;
const ARC_MIN_SEGMENTS = 4;
const ARC_MAX_SEGMENTS = 48;

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

/** Area-weighted centroid of an outer ring minus its holes (label anchor). */
const holeAwareCentroid = (outer: Pt[], holes: Pt[][]): Pt => {
  const oc = polygonCentroid(outer);
  const oa = Math.abs(signedArea(outer));
  if (holes.length === 0 || oa < EPS) return oc;
  let wx = oc.x * oa;
  let wy = oc.y * oa;
  let wsum = oa;
  for (const h of holes) {
    const ha = Math.abs(signedArea(h));
    const hc = polygonCentroid(h);
    wx -= hc.x * ha;
    wy -= hc.y * ha;
    wsum -= ha;
  }
  return Math.abs(wsum) < EPS ? oc : { x: wx / wsum, y: wy / wsum };
};

/** Ray-cast point-in-polygon (y-down agnostic). True when `p` is inside `poly`. */
const pointInPolygon = (p: Pt, poly: Pt[]): boolean => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const intersects = a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
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

/**
 * Append an arc wall's centreline to `out` as a chain of straight facets, each
 * tagged with the arc wall's id. The endpoints stay the stored chord nodes (so
 * they fuse with abutting walls via nodeKey); the interior facet vertices
 * inscribe the true curve. A negligible bulge degrades to the single chord.
 */
const pushArcFacets = (s: ArcWallShape, out: Seg[]): void => {
  const arc = arcFromChordBulge(s.x1, s.y1, s.x2, s.y2, s.bulge);
  if (!arc) {
    if (Math.hypot(s.x2 - s.x1, s.y2 - s.y1) >= ON_SEG_TOL)
      out.push({ a: { x: s.x1, y: s.y1 }, b: { x: s.x2, y: s.y2 }, wallId: s.id });
    return;
  }
  const count = Math.max(
    ARC_MIN_SEGMENTS,
    Math.min(ARC_MAX_SEGMENTS, Math.ceil(Math.abs(arc.sweep) / ARC_SEG_RAD)),
  );
  const flat = arcPolyline(s.x1, s.y1, s.x2, s.y2, s.bulge, count);
  for (let i = 0; i + 3 < flat.length; i += 2)
    out.push({ a: { x: flat[i], y: flat[i + 1] }, b: { x: flat[i + 2], y: flat[i + 3] }, wallId: s.id });
};

/** One traced boundary contour of the planar arrangement. */
interface Contour {
  poly: Pt[];
  /** Signed shoelace area: positive = interior (room), negative = hole / exterior. */
  area: number;
  /** Distinct owning wall shape-ids along this contour. */
  wallIds: Set<string>;
  /** Sorted node-key cycle — id fallback when no wall hosts an edge. */
  cycleKey: string;
}

const computeRoomAreasUncached = (shapes: Record<string, Shape>): RoomArea[] => {
  // --- Wall centerlines as id-tagged segments (arc walls sampled into facets) ---
  const segs: Seg[] = [];
  for (const s of Object.values(shapes)) {
    if (s.type === "wall") {
      if (Math.hypot(s.x2 - s.x1, s.y2 - s.y1) < ON_SEG_TOL) continue;
      segs.push({ a: { x: s.x1, y: s.y1 }, b: { x: s.x2, y: s.y2 }, wallId: s.id });
    } else if (s.type === "arc-wall") {
      pushArcFacets(s, segs);
    }
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
  // Owning wall id per undirected edge (key = sorted node pair) — room-id provenance.
  const edgeWall = new Map<string, string>();
  const edgeKey = (k1: string, k2: string) => (k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`);
  const ensure = (p: Pt): string => {
    const k = nodeKey(p.x, p.y);
    if (!pos.has(k)) {
      pos.set(k, p);
      adj.set(k, new Set());
    }
    return k;
  };
  const addEdge = (k1: string, k2: string, wallId: string) => {
    if (k1 === k2) return;
    adj.get(k1)!.add(k2);
    adj.get(k2)!.add(k1);
    const ek = edgeKey(k1, k2);
    if (!edgeWall.has(ek)) edgeWall.set(ek, wallId);
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
    for (let i = 0; i + 1 < on.length; i++) addEdge(ensure(on[i].p), ensure(on[i + 1].p), seg.wallId);
  }
  if (pos.size < 3) return [];

  // --- Trace EVERY face (both windings) ---
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
  const contours: Contour[] = [];

  for (const start of adj.keys()) {
    for (const next of adj.get(start)!) {
      if (visited.has(`${start}|${next}`)) continue;

      const cycle: string[] = [];
      const wallIds = new Set<string>();
      let u = start;
      let v = next;
      let guard = 0;
      let closed = false;
      while (guard++ < 100000) {
        visited.add(`${u}|${v}`);
        cycle.push(u);
        const w = edgeWall.get(edgeKey(u, v));
        if (w) wallIds.add(w);
        const nx = nextNode(u, v);
        if (nx === null) break;
        u = v;
        v = nx;
        if (u === start && v === next) {
          closed = true;
          break;
        }
      }
      if (!closed || cycle.length < 3) continue;

      const poly = cycle.map((k) => pos.get(k)!);
      const area = signedArea(poly);
      if (!Number.isFinite(area) || Math.abs(area) < MIN_AREA) continue;

      contours.push({ poly, area, wallIds, cycleKey: [...cycle].sort().join("~") });
    }
  }

  // --- Classify: positive faces are rooms; negatives are holes / exterior ---
  const rooms = contours.filter((c) => c.area > 0);
  const negatives = contours.filter((c) => c.area < 0);
  if (rooms.length === 0) return [];

  // Each negative ring is a hole of the SMALLEST-area room that contains it; a
  // negative contained in no room is the unbounded exterior and is dropped.
  const holesByRoom = new Map<Contour, Contour[]>();
  for (const neg of negatives) {
    const probe = polygonCentroid(neg.poly);
    let host: Contour | null = null;
    for (const room of rooms) {
      if (Math.abs(neg.area) >= room.area) continue; // a hole is smaller than its room
      if (!pointInPolygon(probe, room.poly)) continue;
      if (!host || room.area < host.area) host = room;
    }
    if (!host) continue; // contained in no room ⇒ the unbounded exterior
    const list = holesByRoom.get(host);
    if (list) list.push(neg);
    else holesByRoom.set(host, [neg]);
  }

  const out: RoomArea[] = [];
  for (const room of rooms) {
    const holes = holesByRoom.get(room) ?? [];
    const holeArea = holes.reduce((s, h) => s + Math.abs(h.area), 0);
    const netArea = room.area - holeArea;
    if (netArea < MIN_AREA) continue; // a room fully consumed by its holes is not floor

    const ids = new Set(room.wallIds);
    for (const h of holes) for (const w of h.wallIds) ids.add(w);
    const id = ids.size > 0 ? [...ids].sort().join("~") : room.cycleKey;

    const holePolys = holes.map((h) => h.poly);
    out.push({ id, areaPx: netArea, polygon: room.poly, holes: holePolys, centroid: holeAwareCentroid(room.poly, holePolys) });
  }

  // Largest room first — both the takeoff table and the on-canvas labels number
  // rooms in this order, so centralize the ordering here (callers must not
  // re-sort the shared, cached array).
  out.sort((a, b) => b.areaPx - a.areaPx);
  return out;
};

/**
 * Cached entry point. Room detection is an O(n²) arrangement build + planar
 * face trace, and several components consume it (the spaces layer, the takeoff
 * table, …). Shapes are stored immutably, so a WeakMap keyed on the shapes
 * object computes once per shapes version and dedupes every consumer in the
 * same render pass — and across renders where shapes didn't change.
 *
 * The returned array is shared and pre-sorted (largest area first). Treat it as
 * read-only: do not sort or mutate it in place.
 */
const roomCache = new WeakMap<Record<string, Shape>, RoomArea[]>();

export const computeRoomAreas = (shapes: Record<string, Shape>): RoomArea[] => {
  const cached = roomCache.get(shapes);
  if (cached) return cached;
  const rooms = computeRoomAreasUncached(shapes);
  roomCache.set(shapes, rooms);
  return rooms;
};
