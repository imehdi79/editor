/**
 * wallThickness — resolve a wall's thickness at a given node / position.
 *
 * A wall may taper: `thicknessP1` / `thicknessP2` override the nominal
 * `thickness` at each end. These helpers are the single source of truth for
 * "how thick is the wall here", used by the junction geometry (per end) and by
 * openings (interpolated along the span). Pure — no React, no store, no Konva.
 */

import type { WallShape } from "@/core/drawing-engine/drawing.types";

/** The subset of fields thickness resolution needs (so callers can pass partials). */
type TaperedWall = Pick<WallShape, "thickness" | "thicknessP1" | "thicknessP2">;

/** Thickness (px) at one of the wall's endpoints. Falls back to nominal. */
export const endThickness = (wall: TaperedWall, handle: "p1" | "p2"): number =>
  (handle === "p1" ? wall.thicknessP1 : wall.thicknessP2) ?? wall.thickness;

/** Thickness (px) at parameter t along the wall (t=0 → p1, t=1 → p2). */
export const thicknessAt = (wall: TaperedWall, t: number): number => {
  const t1 = endThickness(wall, "p1");
  const t2 = endThickness(wall, "p2");
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  return t1 + (t2 - t1) * clamped;
};

/** Whether the wall tapers (its two ends differ in thickness). */
export const isTapered = (wall: TaperedWall): boolean =>
  endThickness(wall, "p1") !== endThickness(wall, "p2");
