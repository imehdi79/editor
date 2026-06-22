/**
 * dimensionChains.ts — inner and outer running dimension chains for walls.
 *
 * Architecture context
 * ────────────────────
 * In architectural drawing, a single wall run (collinear connected walls) is
 * annotated with TWO parallel "string" (زنجیره) dimension chains:
 *
 *   Outer chain (زنجیره بیرونی):
 *     One overall dimension spanning the OUTER faces of the run endpoints.
 *     No intermediate breaks — just the total outer span.
 *
 *   Inner chain (زنجیره داخلی):
 *     The run is broken at each perpendicular wall junction. The sub-segments
 *     show clear spans BETWEEN perpendicular walls (room-side lengths).
 *     One of those sub-segments equals exactly the thickness of the crossing
 *     perpendicular wall — as the user described.
 *
 * Implementation
 * ──────────────
 * 1. Group walls into collinear runs: walls are in the same run when they share
 *    an endpoint AND their directions are within COLLINEAR_TOLERANCE of parallel.
 * 2. For each run, collect perpendicular-junction points (where a non-run wall
 *    meets the run at a T or L). These become the break-points.
 * 3. Inner chain: sort break-points along the run axis; emit one segment per
 *    gap, placed on the INNER side (left-hand normal of run direction, side +1).
 * 4. Outer chain: one segment from the run's outermost face endpoints to the
 *    other outermost face endpoint, placed OUTER side (side −1), stacked
 *    further out than the inner chain.
 *
 * Pure: no React, no store, no side effects.
 */

import type { Shape, WallShape } from "@/core/drawing-engine/drawing.types";
import { SNAP_EPSILON } from "@/core/topology/computeTopology";
import type { DimensionUnit } from "@/store/editor.store";
import { formatDimension } from "./dimensionUnits";
import { computeSegmentDimension, DIM_OFFSET, type DimensionGeometry } from "./dimensionGeometry";
import { metricsFromGeometry } from "./dimensionLayout";
import { finishBuildup } from "@/core/wall-layers/finishedWall";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cos of angle tolerance for collinearity (≤ ~10°). */
const COLLINEAR_COS_TOLERANCE = 0.985;
/** Extra offset multiplier so chains stack outside the per-segment dims. */
const CHAIN_OFFSET = DIM_OFFSET * 2.4;
/** Minimum gap between two chain points (px) — avoid near-zero segments. */
const MIN_CHAIN_SEG_PX = 6;
/** Max perpendicular distance (px) for a wall endpoint to count as "on the run". */
const ATTACH_EPS = SNAP_EPSILON * 2;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChainSegment {
  id: string;
  x1: number; y1: number;
  x2: number; y2: number;
  text: string;
  geom: DimensionGeometry;
  metrics: ReturnType<typeof metricsFromGeometry>;
  kind: "inner" | "outer";
  conflicted: false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isWall = (s: Shape): s is WallShape => s.type === "wall";

const wallDir = (w: WallShape) => {
  const dx = w.x2 - w.x1;
  const dy = w.y2 - w.y1;
  const l = Math.hypot(dx, dy) || 1;
  return { ux: dx / l, uy: dy / l };
};

const dotDir = (
  ax: number, ay: number,
  bx: number, by: number,
): number => Math.abs(ax * bx + ay * by);

/** Project a point onto a ray (ox, oy) + t*(ux, uy); return t. */
const projectT = (
  px: number, py: number,
  ox: number, oy: number,
  ux: number, uy: number,
): number => (px - ox) * ux + (py - oy) * uy;

// ---------------------------------------------------------------------------
// Step 1 — Build collinear runs
// ---------------------------------------------------------------------------

interface WallRun {
  walls: WallShape[];
  /** Canonical unit direction of the run (normalized). */
  ux: number;
  uy: number;
}

/**
 * Group walls into collinear connected runs.
 * A run is a maximal chain of walls that are (a) connected end-to-end and
 * (b) parallel within COLLINEAR_COS_TOLERANCE.
 */
const buildRuns = (walls: WallShape[]): WallRun[] => {
  const visited = new Set<string>();
  const runs: WallRun[] = [];

  // Adjacency: map from endpoint key → wall ids
  const adj = new Map<string, Set<string>>();
  const key = (x: number, y: number) => `${Math.round(x / SNAP_EPSILON)}_${Math.round(y / SNAP_EPSILON)}`;

  for (const w of walls) {
    for (const [px, py] of [[w.x1, w.y1], [w.x2, w.y2]] as [number, number][]) {
      const k = key(px, py);
      if (!adj.has(k)) adj.set(k, new Set());
      adj.get(k)!.add(w.id);
    }
  }

  const wallById = new Map(walls.map((w) => [w.id, w]));

  for (const seed of walls) {
    if (visited.has(seed.id)) continue;
    const { ux, uy } = wallDir(seed);
    const run: WallShape[] = [seed];
    visited.add(seed.id);

    // BFS: expand along collinear connected walls
    const queue = [seed];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const [px, py] of [[cur.x1, cur.y1], [cur.x2, cur.y2]] as [number, number][]) {
        const k = key(px, py);
        const neighbors = adj.get(k) ?? new Set<string>();
        for (const nid of neighbors) {
          if (visited.has(nid)) continue;
          const neighbor = wallById.get(nid)!;
          const { ux: nx, uy: ny } = wallDir(neighbor);
          if (dotDir(ux, uy, nx, ny) >= COLLINEAR_COS_TOLERANCE) {
            visited.add(nid);
            run.push(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }

    runs.push({ walls: run, ux, uy });
  }

  return runs;
};

// ---------------------------------------------------------------------------
// Step 2 — Collect junction break-points along a run
// ---------------------------------------------------------------------------

/**
 * A break-point junction where an abutting ("retaining") wall meets the run
 * somewhere along its body — at any angle, at any point, NOT only the run's
 * own nodes.
 *
 * Because the user wants face-to-face dimensioning, every junction contributes
 * TWO break-points: where each face of the abutting wall crosses the run axis.
 * The gap between tNear and tFar is therefore exactly that wall's thickness as
 * seen along the run — it becomes its own dimension piece.
 */
interface Junction {
  /** Parameter (along run axis) of the near face. */
  tNear: number;
  /** Parameter (along run axis) of the far face. */
  tFar: number;
  /** Which side of the run the abutting wall extends to (+1 = left perp). */
  side: 1 | -1;
}

interface RunGeom {
  /** Run origin + unit direction. */
  ox: number; oy: number; ux: number; uy: number;
  /** Run span along the axis (from the run's own endpoints). */
  tMin: number; tMax: number;
  junctions: Junction[];
}

/**
 * For a run, collect every abutting-wall junction along its body.
 *
 * An abutting wall qualifies when one of its endpoints lies on the run line
 * (within ATTACH_EPS perpendicular distance) and within the run span — and the
 * wall is NOT collinear with the run (collinear neighbours are already part of
 * the run). The abutting wall may meet the run at a node OR mid-body.
 */
const collectRunGeom = (
  run: WallRun,
  allShapes: Record<string, Shape>,
): RunGeom => {
  const { walls, ux, uy } = run;
  const ox = walls[0].x1;
  const oy = walls[0].y1;

  // Run span from its own wall endpoints.
  let tMin = Infinity;
  let tMax = -Infinity;
  for (const w of walls) {
    for (const [px, py] of [[w.x1, w.y1], [w.x2, w.y2]] as [number, number][]) {
      const t = projectT(px, py, ox, oy, ux, uy);
      if (t < tMin) tMin = t;
      if (t > tMax) tMax = t;
    }
  }

  // Left-hand perpendicular of the run direction (matches computeSegmentDimension
  // side=+1 convention).
  const lpx = -uy;
  const lpy = ux;

  const runIds = new Set(walls.map((w) => w.id));
  const junctions: Junction[] = [];

  for (const shape of Object.values(allShapes)) {
    if (!isWall(shape) || runIds.has(shape.id)) continue;
    const { ux: rx, uy: ry } = wallDir(shape);
    // Collinear walls are continuations, not cross-junctions — skip.
    if (dotDir(ux, uy, rx, ry) >= COLLINEAR_COS_TOLERANCE) continue;

    // Each endpoint paired with its opposite end (which way the wall extends).
    const ends: [number, number, number, number][] = [
      [shape.x1, shape.y1, shape.x2, shape.y2],
      [shape.x2, shape.y2, shape.x1, shape.y1],
    ];
    for (const [px, py, otherX, otherY] of ends) {
      const tFoot = projectT(px, py, ox, oy, ux, uy);
      // Must land within the run span.
      if (tFoot < tMin - ATTACH_EPS || tFoot > tMax + ATTACH_EPS) continue;
      // Perpendicular distance from the endpoint to the run line.
      const footX = ox + ux * tFoot;
      const footY = oy + uy * tFoot;
      if (Math.hypot(px - footX, py - footY) > ATTACH_EPS) continue;

      // This endpoint (px,py) sits on the run. The opposite end tells us which
      // side of the run the abutting wall extends to.
      const side: 1 | -1 = (otherX - px) * lpx + (otherY - py) * lpy >= 0 ? 1 : -1;

      // Face-to-face: intersect each FINISHED face of the abutting wall with the
      // run axis. Faces are the abutting centerline offset along its normal
      // n = (-ry, rx): +n (inner) by the core half + inner finishes, −n (outer)
      // by the core half + outer finishes — so a composite wall's footprint
      // matches its drawn finished body. Solve t*U − s*R = (P ± off) − O for t.
      const fb = finishBuildup(shape);
      const halfPlus = shape.thickness / 2 + fb.inner; // +n face
      const halfMinus = shape.thickness / 2 + fb.outer; // −n face
      const nx = -ry;
      const ny = rx;
      const det = rx * uy - ry * ux;
      const faceT = (sign: 1 | -1): number => {
        const half = sign > 0 ? halfPlus : halfMinus;
        const bx = px + sign * half * nx - ox;
        const by = py + sign * half * ny - oy;
        return (rx * by - ry * bx) / det;
      };
      const ta = faceT(1);
      const tb = faceT(-1);
      junctions.push({ tNear: Math.min(ta, tb), tFar: Math.max(ta, tb), side });
    }
  }

  return { ox, oy, ux, uy, tMin, tMax, junctions };
};

// ---------------------------------------------------------------------------
// Step 3 — Emit chain segments
// ---------------------------------------------------------------------------

/**
 * Emit the SEGMENTED chain on ONE side of the run.
 *
 * Only the clear "room" spans are dimensioned — the gap occupied by each
 * abutting wall (its thickness) is NOT labelled. So each piece runs from the
 * far face of one abutting wall to the near face of the next (face-to-face),
 * and the thickness itself is skipped entirely.
 *
 * The room spans are the complement of the junction thickness-intervals within
 * the run span [tMin, tMax].
 */
const buildSideSegments = (
  geom: RunGeom,
  side: 1 | -1,
  dimensionUnit: DimensionUnit,
  pixelsPerMeter: number,
  runId: string,
  pxScale: number,
): ChainSegment[] => {
  const { ox, oy, ux, uy, tMin, tMax } = geom;
  const offset = CHAIN_OFFSET * pxScale;
  const at = (t: number) => ({ x: ox + ux * t, y: oy + uy * t });

  // Thickness intervals of the abutting walls on this side, clamped into the
  // run span, sorted by start.
  const intervals = geom.junctions
    .filter((j) => j.side === side)
    .map((j): [number, number] => [Math.max(tMin, j.tNear), Math.min(tMax, j.tFar)])
    .filter(([a, b]) => b > a)
    .sort((p, q) => p[0] - q[0]);

  // Room spans = complement of those intervals within [tMin, tMax].
  const roomSpans: [number, number][] = [];
  let cursor = tMin;
  for (const [a, b] of intervals) {
    if (a > cursor) roomSpans.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < tMax) roomSpans.push([cursor, tMax]);

  const segs: ChainSegment[] = [];
  let i = 0;
  for (const [a, b] of roomSpans) {
    const p0 = at(a);
    const p1 = at(b);
    const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    if (len < MIN_CHAIN_SEG_PX) continue;
    const text = formatDimension(len, dimensionUnit, pixelsPerMeter);
    const g = computeSegmentDimension(p0.x, p0.y, p1.x, p1.y, side, offset, pxScale);
    segs.push({
      id: `chain-${runId}-${side}-${i++}`,
      x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y,
      text, geom: g, metrics: metricsFromGeometry(g, text, pxScale),
      kind: "inner", conflicted: false,
    });
  }
  return segs;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build all dimension chain segments for the floor plan.
 *
 * For every collinear wall run, ONLY the side(s) that actually carry abutting
 * ("retaining") walls get a SEGMENTED chain — each clear room span is its own
 * face-to-face piece and the wall thicknesses are not labelled.
 *
 * A side with no break-points gets NO chain — the regular per-segment dimension
 * already covers the wall there, so adding an overall chain would just duplicate
 * it. Runs with no junctions at all get nothing.
 */
export const buildDimensionChains = (
  shapes: Record<string, Shape>,
  dimensionUnit: DimensionUnit,
  pixelsPerMeter: number,
  pxScale: number = 1,
): ChainSegment[] => {
  const walls = Object.values(shapes).filter(isWall);
  if (walls.length === 0) return [];

  const runs = buildRuns(walls);
  const result: ChainSegment[] = [];

  for (let ri = 0; ri < runs.length; ri++) {
    const geom = collectRunGeom(runs[ri], shapes);
    if (geom.junctions.length === 0) continue;
    if (geom.tMax - geom.tMin < MIN_CHAIN_SEG_PX) continue;

    const runId = `run-${ri}`;

    // Only sides that carry abutting walls get a segmented chain. The empty
    // side is left to its default per-segment dimension (no duplicate).
    for (const side of [1, -1] as const) {
      if (!geom.junctions.some((j) => j.side === side)) continue;
      result.push(
        ...buildSideSegments(geom, side, dimensionUnit, pixelsPerMeter, runId, pxScale),
      );
    }
  }

  return result;
};
