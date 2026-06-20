/**
 * classifyJunction — turn a topology node into a classified wall junction.
 *
 * Reuses computeTopology's node (shared endpoints) and wallAngles' bearing math.
 * Only WALL ends count toward a junction: lines, dashed-lines and openings that
 * happen to share the position are ignored, so a wall corner that also touches a
 * dimension line still classifies as a plain L.
 *
 * Pure — no React, no Konva, no store.
 */

import type { Shape, WallShape } from "@/core/drawing-engine/drawing.types";
import type { TopologyNode } from "@/core/topology/computeTopology";
import { absoluteAngleDeg } from "@/core/wall-utils/wallAngles";
import type { ClassifiedJunction, JunctionKind, WallEnd } from "./junction.types";

/**
 * Cos tolerance for treating two wall directions as collinear (≈10°). A
 * geometric truth (not a user choice) → stays a module constant per the
 * wall-junctions rules. Matches the dimension system's collinearity tolerance.
 */
const COLLINEAR_COS = 0.985;

/** The opposite endpoint of a wall — the point its body extends toward. */
const otherEnd = (wall: WallShape, handle: "p1" | "p2"): { x: number; y: number } =>
  handle === "p1" ? { x: wall.x2, y: wall.y2 } : { x: wall.x1, y: wall.y1 };

/** Total layer build-up on one face (kept inline to avoid a wall-layers cycle). */
const sideBuildup = (wall: WallShape, side: "inner" | "outer"): number =>
  (wall.layers?.[side] ?? []).reduce((sum, layer) => sum + layer.thickness, 0);

/** Build the wall ends meeting at a node, sorted by bearing (CCW from East). */
const wallEndsAt = (node: TopologyNode, shapes: Record<string, Shape>): WallEnd[] => {
  const ends: WallEnd[] = [];
  for (const ref of node.refs) {
    const wall = shapes[ref.shapeId];
    if (!wall || wall.type !== "wall") continue;
    const away = otherEnd(wall, ref.handle);
    const dx = away.x - node.x;
    const dy = away.y - node.y;
    const len = Math.hypot(dx, dy) || 1;
    ends.push({
      wallId: wall.id,
      handle: ref.handle,
      thickness: wall.thickness,
      offset: wall.offset ?? 0,
      buildupInner: sideBuildup(wall, "inner"),
      buildupOuter: sideBuildup(wall, "outer"),
      dirX: dx / len,
      dirY: dy / len,
      bearing: absoluteAngleDeg(node.x, node.y, away.x, away.y),
    });
  }
  ends.sort((a, b) => a.bearing - b.bearing);
  return ends;
};

/** Pick the junction kind from the number (and arrangement) of wall ends. */
const classifyKind = (ends: WallEnd[]): JunctionKind => {
  switch (ends.length) {
    case 0:
    case 1:
      return "free";
    case 2: {
      const [a, b] = ends;
      // Straight pass-through: the two walls leave the node in opposite
      // directions (dot of away-directions ≈ −1).
      const dot = a.dirX * b.dirX + a.dirY * b.dirY;
      return dot <= -COLLINEAR_COS ? "collinear" : "L";
    }
    case 3:
      return "T";
    case 4:
      return "X";
    default:
      return "star";
  }
};

/**
 * Classify a single topology node. Returns null when no wall end lives there
 * (e.g. a node formed only by lines / dimension geometry).
 */
export const classifyJunction = (
  node: TopologyNode,
  shapes: Record<string, Shape>,
): ClassifiedJunction | null => {
  const ends = wallEndsAt(node, shapes);
  if (ends.length === 0) return null;
  return { key: node.key, x: node.x, y: node.y, kind: classifyKind(ends), ends };
};
