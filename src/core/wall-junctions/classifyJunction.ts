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

import type { ArcWallShape, JoinStyle, Shape, WallShape } from "@/core/drawing-engine/drawing.types";
import type { TopologyNode } from "@/core/topology/computeTopology";
import { absoluteAngleDeg } from "@/core/wall-utils/wallAngles";
import { endThickness } from "@/core/wall-utils/wallThickness";
import { arcTangentAtEnd } from "@/core/arc/arcGeometry";
import type { ClassifiedJunction, JunctionKind, WallEnd } from "./junction.types";

/** Either wall variant — both contribute a solid body to a junction. */
type AnyWall = WallShape | ArcWallShape;
const isWall = (s: Shape | undefined): s is AnyWall =>
  !!s && (s.type === "wall" || s.type === "arc-wall");

/**
 * Cos tolerance for treating two wall directions as collinear (≈10°). A
 * geometric truth (not a user choice) → stays a module constant per the
 * wall-junctions rules. Matches the dimension system's collinearity tolerance.
 */
const COLLINEAR_COS = 0.985;

/**
 * Unit direction a wall end leaves the node, INTO its body. A straight wall
 * leaves along its chord toward the far endpoint; an arc wall leaves along its
 * tangent at the shared endpoint (so the junction mitres against the true curve,
 * not the chord). This is the only geometric difference between the two variants
 * at a junction — everything downstream consumes this direction.
 */
const awayDir = (wall: AnyWall, handle: "p1" | "p2"): { x: number; y: number } => {
  if (wall.type === "arc-wall") return arcTangentAtEnd(wall.x1, wall.y1, wall.x2, wall.y2, wall.bulge, handle);
  const ax = handle === "p1" ? wall.x2 - wall.x1 : wall.x1 - wall.x2;
  const ay = handle === "p1" ? wall.y2 - wall.y1 : wall.y1 - wall.y2;
  const len = Math.hypot(ax, ay) || 1;
  return { x: ax / len, y: ay / len };
};

/** Total layer build-up on one face (kept inline to avoid a wall-layers cycle). */
const sideBuildup = (wall: AnyWall, side: "inner" | "outer"): number =>
  (wall.layers?.[side] ?? []).reduce((sum, layer) => sum + layer.thickness, 0);

/** Build the wall ends meeting at a node, sorted by bearing (CCW from East). */
const wallEndsAt = (node: TopologyNode, shapes: Record<string, Shape>): WallEnd[] => {
  const ends: WallEnd[] = [];
  for (const ref of node.refs) {
    const wall = shapes[ref.shapeId];
    if (!isWall(wall)) continue;
    const dir = awayDir(wall, ref.handle);
    ends.push({
      wallId: wall.id,
      handle: ref.handle,
      // A tapered wall contributes its thickness AT THIS NODE, so the junction
      // mitres each end at the correct local width (arc walls are uniform).
      thickness: endThickness(wall, ref.handle),
      offset: wall.offset ?? 0,
      buildupInner: sideBuildup(wall, "inner"),
      buildupOuter: sideBuildup(wall, "outer"),
      dirX: dir.x,
      dirY: dir.y,
      bearing: absoluteAngleDeg(node.x, node.y, node.x + dir.x, node.y + dir.y),
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
 * The node's per-node join override, read from the walls meeting there. All
 * endpoints at a node are kept in sync (useSetNodeJoin), so the first defined
 * override is the node's choice; undefined → fall back to the global default.
 */
const nodeJoinOverride = (node: TopologyNode, shapes: Record<string, Shape>): JoinStyle | undefined => {
  for (const ref of node.refs) {
    const wall = shapes[ref.shapeId];
    if (!isWall(wall)) continue;
    const join = ref.handle === "p1" ? wall.joinP1 : wall.joinP2;
    if (join) return join;
  }
  return undefined;
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
  return {
    key: node.key,
    x: node.x,
    y: node.y,
    kind: classifyKind(ends),
    ends,
    joinStyle: nodeJoinOverride(node, shapes),
  };
};
