/**
 * computeTopology.ts — endpoint connectivity graph for floor-plan shapes.
 *
 * Two shape endpoints are "connected" when they occupy the same canvas
 * coordinate within SNAP_EPSILON pixels. This happens whenever the user
 * draws shapes that share a corner or join end-to-end.
 *
 * The result is a node map: a map from a canonical position key to the list
 * of all (shapeId, handle) pairs that live at that position.
 *
 * This is used by:
 *   - SelectionRenderer: render ONE handle circle per shared node position
 *     instead of one per endpoint, eliminating the z-index/mismatch bug.
 *   - useTransformEngine: when dragging a shared node, update ALL connected
 *     endpoints simultaneously so walls stay joined.
 *
 * Pure function — no React, no store, no side effects.
 */

import type { Shape, ShapeId } from "@/core/drawing-engine/drawing.types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Two endpoints are considered connected when they are within this many
 * canvas pixels. Should match the snapping precision of the drawing engine.
 */
export const SNAP_EPSILON = 1.0;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One endpoint of one shape. */
export interface EndpointRef {
  shapeId: ShapeId;
  /** "p1" = (x1,y1), "p2" = (x2,y2) */
  handle: "p1" | "p2";
  x: number;
  y: number;
}

/**
 * A canonical node in the topology graph.
 * When refs.length > 1, this is a shared/connected node.
 */
export interface TopologyNode {
  /** Canonical position (average of all refs, in practice all identical) */
  x: number;
  y: number;
  /** All endpoints that live at this position */
  refs: EndpointRef[];
  /** Stable key derived from position */
  key: string;
}

/** Map from node key → TopologyNode */
export type TopologyMap = Map<string, TopologyNode>;

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

/** Round to nearest SNAP_EPSILON to canonicalize nearby floats. */
export const nodeKey = (x: number, y: number): string => {
  const kx = Math.round(x / SNAP_EPSILON);
  const ky = Math.round(y / SNAP_EPSILON);
  return `${kx}_${ky}`;
};

// ---------------------------------------------------------------------------
// Main computation
// ---------------------------------------------------------------------------

/**
 * Build the full topology map from the current shapes.
 * O(n) — one pass over all shape endpoints.
 */
export const computeTopology = (shapes: Record<string, Shape>): TopologyMap => {
  const map: TopologyMap = new Map();

  for (const shape of Object.values(shapes)) {
    // Text shapes have no geometric endpoints
    if (shape.type === "text") continue;

    const endpoints: EndpointRef[] = [
      { shapeId: shape.id, handle: "p1", x: shape.x1, y: shape.y1 },
      { shapeId: shape.id, handle: "p2", x: shape.x2, y: shape.y2 },
    ];

    for (const ep of endpoints) {
      const key = nodeKey(ep.x, ep.y);
      const existing = map.get(key);
      if (existing) {
        existing.refs.push(ep);
        // Average position (all refs should be identical in practice)
        existing.x = existing.refs.reduce((s, r) => s + r.x, 0) / existing.refs.length;
        existing.y = existing.refs.reduce((s, r) => s + r.y, 0) / existing.refs.length;
      } else {
        map.set(key, { x: ep.x, y: ep.y, refs: [ep], key });
      }
    }
  }

  return map;
};

/**
 * Look up which topology node a given (x, y) point belongs to.
 * Returns null if no shape endpoint is at that position.
 */
export const nodeAtPoint = (x: number, y: number, topology: TopologyMap): TopologyNode | null =>
  topology.get(nodeKey(x, y)) ?? null;

/**
 * Get all endpoint refs connected to the node that contains (x, y).
 * Returns an empty array if no node is found.
 */
export const connectedEndpoints = (x: number, y: number, topology: TopologyMap): EndpointRef[] =>
  nodeAtPoint(x, y, topology)?.refs ?? [];
