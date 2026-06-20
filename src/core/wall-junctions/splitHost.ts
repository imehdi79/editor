/**
 * splitHost — mid-span connection (#16).
 *
 * When a freshly-drawn wall's endpoint lands on the BODY of an existing wall
 * (not at the host's own endpoint), the host must be split into two walls that
 * share a node with the new endpoint, turning a floating touch into a real
 * 3-end T that the junction + dimension systems can resolve. The new endpoint is
 * snapped exactly onto the host centreline so the node is shared cleanly.
 *
 * Both halves inherit the host's thickness, height, layers and category — a
 * split wall is still the same construction.
 *
 * Pure — no React, no Konva, no store.
 */

import type { Shape, ShapeId, WallShape } from "@/core/drawing-engine/drawing.types";
import { projectOntoWall } from "@/core/wall-utils/wallGeometry";
import { SNAP_EPSILON } from "@/core/topology/computeTopology";

/** A host wall to delete, replaced by two halves split at the connection point. */
export interface WallSplit {
  hostId: ShapeId;
  parts: [Omit<WallShape, "id">, Omit<WallShape, "id">];
}

export interface MidSpanResult {
  /** The new wall, with any landing endpoint snapped onto the host centreline. */
  wall: Omit<WallShape, "id">;
  /** Hosts to split (empty when the wall joins only at endpoints / free space). */
  splits: WallSplit[];
}

/** Shortest part a split may leave — below this it's an endpoint join, not a split. */
const MIN_PART = 2;

const near = (ax: number, ay: number, bx: number, by: number): boolean =>
  Math.abs(ax - bx) <= SNAP_EPSILON && Math.abs(ay - by) <= SNAP_EPSILON;

/** Carry the host's construction onto a half. */
const inherit = (host: WallShape) => ({
  type: "wall" as const,
  thickness: host.thickness,
  height: host.height,
  layers: host.layers,
  category: host.category,
});

/**
 * Resolve mid-span connections for a wall about to be committed. Returns the
 * (possibly endpoint-snapped) wall plus the host splits to apply atomically.
 */
export const resolveMidSpanSplits = (
  wall: Omit<WallShape, "id">,
  shapes: Record<string, Shape>,
): MidSpanResult => {
  let { x1, y1, x2, y2 } = wall;
  const splits: WallSplit[] = [];

  for (const host of Object.values(shapes)) {
    if (host.type !== "wall") continue;
    const ends: ["p1" | "p2", number, number][] = [
      ["p1", x1, y1],
      ["p2", x2, y2],
    ];
    for (const [handle, px, py] of ends) {
      // A landing at the host's own endpoint is a normal end-join, not a split.
      if (near(px, py, host.x1, host.y1) || near(px, py, host.x2, host.y2)) continue;
      const proj = projectOntoWall(px, py, host);
      if (proj.dist > SNAP_EPSILON) continue;
      const hostLen = Math.hypot(host.x2 - host.x1, host.y2 - host.y1);
      if (proj.t * hostLen < MIN_PART || (1 - proj.t) * hostLen < MIN_PART) continue;

      // Snap the new endpoint exactly onto the host centreline → shared node.
      if (handle === "p1") {
        x1 = proj.x;
        y1 = proj.y;
      } else {
        x2 = proj.x;
        y2 = proj.y;
      }
      const base = inherit(host);
      splits.push({
        hostId: host.id,
        parts: [
          { ...base, x1: host.x1, y1: host.y1, x2: proj.x, y2: proj.y },
          { ...base, x1: proj.x, y1: proj.y, x2: host.x2, y2: host.y2 },
        ],
      });
      break; // one split point per host
    }
  }

  return { wall: { ...wall, x1, y1, x2, y2 }, splits };
};
