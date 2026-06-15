/**
 * wallLayers — pure helpers for a wall's per-side construction layers.
 *
 * Layers describe how a wall is actually built up on each face (e.g. brick then
 * plaster). They are a specification/takeoff concern only: never drawn or
 * dimensioned on the canvas. These helpers create layers and read / write a
 * side's stack immutably, so callers can hand the result straight to
 * `updateShape(wallId, { layers })`.
 *
 * No React, no Konva, no store access.
 */

import { uid } from "@/lib/uid";
import type { WallLayer, WallShape, WallSide } from "@/core/drawing-engine/drawing.types";

/** Wall faces in display order. */
export const WALL_SIDES = ["inner", "outer"] as const satisfies readonly WallSide[];

export const WALL_SIDE_LABEL: Record<WallSide, string> = {
  inner: "Inner face",
  outer: "Outer face",
};

/** A fresh layer. Defaults model a typical brick build-up (~20cm at 100ppm). */
export const createWallLayer = (material = "Brick", thickness = 20): WallLayer => ({
  id: uid(),
  material,
  thickness,
});

/** A wall's layer stack for one face (empty when none defined). */
export const layersOf = (wall: WallShape, side: WallSide): WallLayer[] => wall.layers?.[side] ?? [];

/**
 * Return a complete `layers` record with `side` replaced by `next`, preserving
 * the other side. Use this to build the patch for `updateShape`.
 */
export const withSideLayers = (
  wall: WallShape,
  side: WallSide,
  next: WallLayer[],
): Record<WallSide, WallLayer[]> => ({
  inner: side === "inner" ? next : layersOf(wall, "inner"),
  outer: side === "outer" ? next : layersOf(wall, "outer"),
});
