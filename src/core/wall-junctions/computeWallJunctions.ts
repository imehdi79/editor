/**
 * computeWallJunctions — classify every wall node of the floor plan.
 *
 * Classification (free / L / collinear / T / X / star) depends only on `shapes`
 * geometry, never on the user's join-style choices, so it is WeakMap-cached by
 * the shapes object exactly like computeRoomAreas / computeTopology — every
 * consumer in a render pass shares one result. Join *style* is applied on top by
 * computeWallOutline, so this cache stays correct when only a setting changes.
 *
 * Pure — no React, no Konva, no store.
 */

import type { Shape } from "@/core/drawing-engine/drawing.types";
import { computeTopology, nodeKey } from "@/core/topology/computeTopology";
import { classifyJunction } from "./classifyJunction";
import type { ClassifiedJunction, JunctionMap } from "./junction.types";

const computeUncached = (shapes: Record<string, Shape>): JunctionMap => {
  const topology = computeTopology(shapes);
  const map: JunctionMap = new Map();
  for (const node of topology.values()) {
    const junction = classifyJunction(node, shapes);
    if (junction) map.set(junction.key, junction);
  }
  return map;
};

const cache = new WeakMap<Record<string, Shape>, JunctionMap>();

/** Classified wall junctions for the floor plan. Cached per shapes version. */
export const computeWallJunctions = (shapes: Record<string, Shape>): JunctionMap => {
  const cached = cache.get(shapes);
  if (cached) return cached;
  const result = computeUncached(shapes);
  cache.set(shapes, result);
  return result;
};

/** The junction (if any) at a given canvas point — looks up by node key. */
export const junctionAt = (
  x: number,
  y: number,
  junctions: JunctionMap,
): ClassifiedJunction | null => junctions.get(nodeKey(x, y)) ?? null;
