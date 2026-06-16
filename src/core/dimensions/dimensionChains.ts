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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cos of angle tolerance for collinearity (≤ ~10°). */
const COLLINEAR_COS_TOLERANCE = 0.985;
/** Cos of angle for perpendicularism at junctions (≤ ~75° from 90°). */
const PERP_COS_TOLERANCE = 0.26;
/** Extra offset multiplier so chains stack outside the per-segment dims. */
const INNER_CHAIN_OFFSET = DIM_OFFSET * 2.2;
const OUTER_CHAIN_OFFSET = DIM_OFFSET * 3.6;
/** Minimum gap between two chain points (px) — avoid near-zero segments. */
const MIN_CHAIN_SEG_PX = 6;

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

const samePoint = (ax: number, ay: number, bx: number, by: number) =>
  Math.abs(ax - bx) <= SNAP_EPSILON * 2 && Math.abs(ay - by) <= SNAP_EPSILON * 2;

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
 * For a run, find all T-junction points: positions where a perpendicular wall
 * meets any wall in the run (at one of its endpoints). The break-point is the
 * foot of the perpendicular wall on the run axis.
 *
 * Also includes the two outermost endpoints of the run itself.
 *
 * Returns sorted t-values (parameter along the run axis) and their world coords.
 */
interface RunPoint {
  t: number;
  x: number;
  y: number;
}

const collectRunPoints = (
  run: WallRun,
  allShapes: Record<string, Shape>,
): { origin: { x: number; y: number }; points: RunPoint[] } => {
  const { walls, ux, uy } = run;

  // Determine run origin: the wall endpoint with smallest t=0 by convention
  // We pick the first wall's p1 as the reference origin.
  const ox = walls[0].x1;
  const oy = walls[0].y1;

  const ts = new Map<number, RunPoint>();

  const addPoint = (px: number, py: number) => {
    const t = Math.round(projectT(px, py, ox, oy, ux, uy) * 10) / 10;
    if (!ts.has(t)) ts.set(t, { t, x: ox + ux * t, y: oy + uy * t });
  };

  // All run wall endpoints
  for (const w of walls) {
    addPoint(w.x1, w.y1);
    addPoint(w.x2, w.y2);
  }

  // Build a set of run wall ids for quick lookup
  const runIds = new Set(walls.map((w) => w.id));

  // T-junction perpendicular walls
  for (const shape of Object.values(allShapes)) {
    if (!isWall(shape) || runIds.has(shape.id)) continue;
    const { ux: nx, uy: ny } = wallDir(shape);
    if (dotDir(ux, uy, nx, ny) > PERP_COS_TOLERANCE) continue; // not perpendicular

    // Check if this perpendicular wall meets any run wall
    for (const [px, py] of [[shape.x1, shape.y1], [shape.x2, shape.y2]] as [number, number][]) {
      for (const rw of walls) {
        if (samePoint(px, py, rw.x1, rw.y1) || samePoint(px, py, rw.x2, rw.y2)) {
          addPoint(px, py);
        }
      }
    }
  }

  const sorted = [...ts.values()].sort((a, b) => a.t - b.t);
  return { origin: { x: ox, y: oy }, points: sorted };
};

// ---------------------------------------------------------------------------
// Step 3 — Emit chain segments
// ---------------------------------------------------------------------------

const buildChainSegments = (
  points: RunPoint[],
  kind: "inner" | "outer",
  dimensionUnit: DimensionUnit,
  pixelsPerMeter: number,
  runId: string,
  pxScale: number,
): ChainSegment[] => {
  const side: 1 | -1 = kind === "inner" ? 1 : -1;
  const offset = (kind === "inner" ? INNER_CHAIN_OFFSET : OUTER_CHAIN_OFFSET) * pxScale;

  if (kind === "outer") {
    // One overall segment from first to last point
    const p0 = points[0];
    const pN = points[points.length - 1];
    if (points.length < 2) return [];
    const len = Math.hypot(pN.x - p0.x, pN.y - p0.y);
    if (len < MIN_CHAIN_SEG_PX) return [];
    const text = formatDimension(len, dimensionUnit, pixelsPerMeter);
    const geom = computeSegmentDimension(p0.x, p0.y, pN.x, pN.y, side, offset, pxScale);
    return [{
      id: `chain-outer-${runId}`,
      x1: p0.x, y1: p0.y, x2: pN.x, y2: pN.y,
      text, geom, metrics: metricsFromGeometry(geom, text, pxScale),
      kind, conflicted: false,
    }];
  }

  // Inner: one segment per consecutive pair of points
  const segs: ChainSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    if (len < MIN_CHAIN_SEG_PX) continue;
    const text = formatDimension(len, dimensionUnit, pixelsPerMeter);
    const geom = computeSegmentDimension(p0.x, p0.y, p1.x, p1.y, side, offset, pxScale);
    segs.push({
      id: `chain-inner-${runId}-${i}`,
      x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y,
      text, geom, metrics: metricsFromGeometry(geom, text, pxScale),
      kind, conflicted: false,
    });
  }
  return segs;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build all inner + outer dimension chain segments for the floor plan.
 * Only runs with ≥ 1 perpendicular junction (i.e., the inner chain would have
 * ≥ 2 segments, meaning there IS something to show beyond the regular dim)
 * get a full inner+outer pair. Single-wall runs with no junctions get no chains
 * — the regular per-segment dimension already covers them.
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
    const run = runs[ri];
    const { points } = collectRunPoints(run, shapes);

    // Only emit chains when there are interior break-points (T-junctions)
    // i.e., more than 2 distinct points (the two run endpoints + ≥1 junction)
    if (points.length < 3) continue;

    const runId = `run-${ri}`;
    result.push(...buildChainSegments(points, "inner", dimensionUnit, pixelsPerMeter, runId, pxScale));
    result.push(...buildChainSegments(points, "outer", dimensionUnit, pixelsPerMeter, runId, pxScale));
  }

  return result;
};
