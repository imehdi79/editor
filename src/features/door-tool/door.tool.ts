/**
 * doorToolDefinition — places a door opening on a wall.
 *
 * Initial state on placement:
 *   hingeSide      = "left" (hinge at the drag start point)
 *   swingDirection = determined by which side of the wall the drag ends on
 *                    ("inward" if cursor is on the left-hand normal side)
 */

import type { ToolDefinition } from "@/core/drawing-engine/tool-definition.types";
import type { DoorShape } from "@/core/drawing-engine/drawing.types";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { findNearestWall, projectOntoWall, openingGeometryFromDrag } from "@/core/wall-utils/wallGeometry";

const DEFAULT_THICKNESS = 12;
const WALL_SNAP_RADIUS = 40;
const MIN_DOOR_WIDTH = 20;

const getShapes = () => useFloorPlanStore.getState().shapes;

/** Returns "inward" if cursor is on the left-hand normal side of the wall. */
const computeSwingDirection = (
  cursorX: number,
  cursorY: number,
  wall: { x1: number; y1: number; x2: number; y2: number },
): "inward" | "outward" => {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  // Cross product z: positive = left (inward), negative = right (outward)
  const cross = dx * (cursorY - wall.y1) - dy * (cursorX - wall.x1);
  return cross >= 0 ? "inward" : "outward";
};

export const doorToolDefinition: ToolDefinition = {
  minLength: MIN_DOOR_WIDTH,

  buildGhost: (x1, y1, x2, y2) => {
    const shapes = getShapes();
    const startProj = findNearestWall(x1, y1, shapes, WALL_SNAP_RADIUS);
    if (!startProj) return { type: "line", x1, y1, x2, y2 };

    const wall = startProj.wall;
    const endProj = projectOntoWall(x2, y2, wall);
    const geo = openingGeometryFromDrag(wall, startProj.t, endProj.t, MIN_DOOR_WIDTH);

    const ghost: Omit<DoorShape, "id"> = {
      type: "door",
      x1: geo.x1,
      y1: geo.y1,
      x2: geo.x2,
      y2: geo.y2,
      width: Math.hypot(geo.x2 - geo.x1, geo.y2 - geo.y1),
      thickness: wall.thickness ?? DEFAULT_THICKNESS,
      wallId: wall.id,
      hingeSide: "left",
      swingDirection: computeSwingDirection(x2, y2, wall),
    };
    return ghost;
  },

  buildShape: (x1, y1, x2, y2) => {
    const shapes = getShapes();
    const startProj = findNearestWall(x1, y1, shapes, WALL_SNAP_RADIUS);
    if (!startProj) {
      return {
        type: "door",
        x1,
        y1,
        x2,
        y2,
        width: Math.hypot(x2 - x1, y2 - y1),
        thickness: DEFAULT_THICKNESS,
        wallId: null,
        hingeSide: "left",
        swingDirection: "inward",
      };
    }

    const wall = startProj.wall;
    const endProj = projectOntoWall(x2, y2, wall);
    const geo = openingGeometryFromDrag(wall, startProj.t, endProj.t, MIN_DOOR_WIDTH);

    return {
      type: "door",
      x1: geo.x1,
      y1: geo.y1,
      x2: geo.x2,
      y2: geo.y2,
      width: Math.hypot(geo.x2 - geo.x1, geo.y2 - geo.y1),
      thickness: wall.thickness ?? DEFAULT_THICKNESS,
      wallId: wall.id,
      hingeSide: "left",
      swingDirection: computeSwingDirection(x2, y2, wall),
    };
  },
};
