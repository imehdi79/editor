/**
 * useSetWallThickness — set a wall's structural thickness and keep any openings
 * (doors/windows) hosted on it consistent: openings cut the wall, so they must
 * share its thickness. Shared by the wall panel (WallActions) and the on-canvas
 * node thickness editor so the "sync openings" rule lives in exactly one place.
 *
 * Works for straight and arc walls; arc walls host no openings yet, so the loop
 * is simply a no-op for them.
 */

import { useFloorPlanStore } from "@/store/floor-plan.store";
import type { ShapeId } from "@/core/drawing-engine/drawing.types";

export const useSetWallThickness = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const updateShape = useFloorPlanStore((s) => s.updateShape);

  return (wallId: ShapeId, thickness: number) => {
    updateShape(wallId, { thickness });
    for (const s of Object.values(shapes)) {
      if ((s.type === "door" || s.type === "window") && s.wallId === wallId) {
        updateShape(s.id, { thickness });
      }
    }
  };
};
