/**
 * wallIssues — non-destructive validation hints for wall geometry.
 *
 * Detects two common, easy-to-miss mistakes and surfaces them as markers; it
 * NEVER edits or deletes anything (the user decides):
 *
 *   overlap (#13)  — two collinear walls whose spans lie on top of each other
 *                    (usually a duplicate / double-drawn wall).
 *   touching (#14) — a wall endpoint that sits visually on another wall (its
 *                    body or end) but is just too far to share a node, so the
 *                    two are drawn touching yet remain logically separate.
 *
 * Pure — no React, no Konva, no store. Cached per shapes version.
 */

import type { Shape, ShapeId, WallShape } from "@/core/drawing-engine/drawing.types";
import { projectOntoWall } from "@/core/wall-utils/wallGeometry";
import { SNAP_EPSILON } from "@/core/topology/computeTopology";

export type WallIssueKind = "overlap" | "touching";

export interface WallIssue {
  kind: WallIssueKind;
  /** Where to place the marker, canvas space. */
  x: number;
  y: number;
  walls: [ShapeId, ShapeId];
}

/** Cos tolerance for collinearity (≈10°). */
const COLLINEAR_COS = 0.985;
/** Max perpendicular distance for two centrelines to count as the same line. */
const SAME_LINE_TOL = 1.0;
/** Minimum overlap length to report (below this it's just a shared endpoint). */
const MIN_OVERLAP = 2;
/** A gap in this band looks joined but isn't (≤ SNAP is already a real node). */
const TOUCH_TOL = 4;

const isWall = (s: Shape): s is WallShape => s.type === "wall";

const dirOf = (w: WallShape) => {
  const dx = w.x2 - w.x1;
  const dy = w.y2 - w.y1;
  const len = Math.hypot(dx, dy) || 1;
  return { ux: dx / len, uy: dy / len, len };
};

const detect = (shapes: Record<string, Shape>): WallIssue[] => {
  const walls = Object.values(shapes).filter(isWall);
  const issues: WallIssue[] = [];

  // --- overlaps: collinear walls on the same line with overlapping spans ---
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const a = walls[i];
      const b = walls[j];
      const da = dirOf(a);
      const db = dirOf(b);
      if (Math.abs(da.ux * db.ux + da.uy * db.uy) < COLLINEAR_COS) continue;
      // Perpendicular distance of b's midpoint to a's infinite line.
      const mx = (b.x1 + b.x2) / 2 - a.x1;
      const my = (b.y1 + b.y2) / 2 - a.y1;
      const perp = Math.abs(mx * -da.uy + my * da.ux);
      if (perp > SAME_LINE_TOL) continue;
      // Project both walls onto a's axis (param = signed distance from a.x1).
      const t = (px: number, py: number) => (px - a.x1) * da.ux + (py - a.y1) * da.uy;
      const aMin = 0;
      const aMax = da.len;
      const bMin = Math.min(t(b.x1, b.y1), t(b.x2, b.y2));
      const bMax = Math.max(t(b.x1, b.y1), t(b.x2, b.y2));
      const lo = Math.max(aMin, bMin);
      const hi = Math.min(aMax, bMax);
      if (hi - lo > MIN_OVERLAP) {
        const mid = (lo + hi) / 2;
        issues.push({ kind: "overlap", x: a.x1 + da.ux * mid, y: a.y1 + da.uy * mid, walls: [a.id, b.id] });
      }
    }
  }

  // --- touching but not joined: an endpoint near another wall, beyond snap ---
  const seen = new Set<string>();
  for (const w of walls) {
    for (const [px, py] of [[w.x1, w.y1], [w.x2, w.y2]] as [number, number][]) {
      for (const o of walls) {
        if (o.id === w.id) continue;
        const proj = projectOntoWall(px, py, o);
        if (proj.dist <= SNAP_EPSILON || proj.dist > TOUCH_TOL) continue;
        const key = [w.id, o.id].sort().join("|") + `@${Math.round(proj.x)}_${Math.round(proj.y)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        issues.push({ kind: "touching", x: proj.x, y: proj.y, walls: [w.id, o.id] });
      }
    }
  }

  return issues;
};

const cache = new WeakMap<Record<string, Shape>, WallIssue[]>();

/** Validation hints for the floor plan. Cached per shapes version. */
export const detectWallIssues = (shapes: Record<string, Shape>): WallIssue[] => {
  const hit = cache.get(shapes);
  if (hit) return hit;
  const result = detect(shapes);
  cache.set(shapes, result);
  return result;
};
