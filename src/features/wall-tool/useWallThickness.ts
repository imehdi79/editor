/**
 * Wall thickness setters — kept in one place so the "openings stay in sync with
 * the wall they cut" rule lives once.
 *
 * - useSetWallThickness: set a UNIFORM thickness (resets any taper). Used by the
 *   wall panel (WallActions).
 * - useSetWallEndThickness: set the thickness at ONE node, tapering the wall.
 *   Used by the on-canvas node thickness editor. `thickness` is kept as the mean
 *   of the two ends so single-value consumers stay sensible; equal ends collapse
 *   back to a clean uniform wall.
 *
 * Openings (doors/windows) inherit the wall's thickness at their own position
 * along the span, so they keep matching a tapered wall.
 */

import { useFloorPlanStore } from "@/store/floor-plan.store";
import type { Shape, ShapeId, WallShape } from "@/core/drawing-engine/drawing.types";
import { endThickness } from "@/core/wall-utils/wallThickness";
import { tOnWall } from "@/core/wall-utils/wallGeometry";

/** Push thickness onto every opening hosted on the wall, evaluated at its span t. */
const syncOpenings = (
  shapes: Record<string, Shape>,
  updateShape: (id: ShapeId, patch: { thickness: number }) => void,
  wall: WallShape,
  thicknessAtT: (t: number) => number,
) => {
  for (const s of Object.values(shapes)) {
    if ((s.type === "door" || s.type === "window") && s.wallId === wall.id) {
      const t = tOnWall((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, wall);
      updateShape(s.id, { thickness: thicknessAtT(t) });
    }
  }
};

export const useSetWallThickness = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const updateShape = useFloorPlanStore((s) => s.updateShape);

  return (wallId: ShapeId, thickness: number) => {
    const wall = shapes[wallId];
    // Uniform thickness clears any per-node taper.
    updateShape(wallId, { thickness, thicknessP1: undefined, thicknessP2: undefined });
    if (wall?.type === "wall") syncOpenings(shapes, updateShape, wall, () => thickness);
  };
};

export const useSetWallEndThickness = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const updateShape = useFloorPlanStore((s) => s.updateShape);

  return (wallId: ShapeId, handle: "p1" | "p2", value: number) => {
    const wall = shapes[wallId];
    if (wall?.type !== "wall") return; // taper applies to straight walls only

    const t1 = handle === "p1" ? value : endThickness(wall, "p1");
    const t2 = handle === "p2" ? value : endThickness(wall, "p2");

    if (t1 === t2) {
      updateShape(wallId, { thickness: t1, thicknessP1: undefined, thicknessP2: undefined });
    } else {
      updateShape(wallId, { thickness: (t1 + t2) / 2, thicknessP1: t1, thicknessP2: t2 });
    }
    syncOpenings(shapes, updateShape, wall, (t) => t1 + (t2 - t1) * Math.max(0, Math.min(1, t)));
  };
};
