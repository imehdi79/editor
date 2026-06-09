/**
 * windowToolDefinition — places a window opening on a wall.
 *
 * Placement flow:
 *  1. mousedown — snap to nearest wall; record start t along that wall
 *  2. mousemove — compute opening from drag start→current (both projected
 *     onto the same wall); emit a ghost WindowShape
 *  3. mouseup  — commit the WindowShape to the floor-plan store
 *
 * Wall geometry is resolved at call time via useFloorPlanStore.getState()
 * (Zustand's synchronous read) so this definition remains a plain object
 * consistent with the existing TOOL_REGISTRY pattern.
 */

import type { ToolDefinition } from "@/core/drawing-engine/tool-definition.types";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import {
  findNearestWall,
  projectOntoWall,
  openingGeometryFromDrag,
} from "@/core/wall-utils/wallGeometry";

const DEFAULT_THICKNESS = 12;
const WALL_SNAP_RADIUS = 40; // px — how far from wall to activate attachment
const MIN_WINDOW_WIDTH = 20; // px

const getShapes = () => useFloorPlanStore.getState().shapes;

export const windowToolDefinition: ToolDefinition = {
  minLength: MIN_WINDOW_WIDTH,

  buildGhost: (x1, y1, x2, y2) => {
    const shapes = getShapes();

    // Project drag start onto nearest wall
    const startProj = findNearestWall(x1, y1, shapes, WALL_SNAP_RADIUS);
    if (!startProj) {
      // No wall nearby — plain line ghost so user gets positional feedback
      return { type: "line", x1, y1, x2, y2 };
    }

    const wall = startProj.wall;
    const endProj = projectOntoWall(x2, y2, wall);
    const geo = openingGeometryFromDrag(wall, startProj.t, endProj.t, MIN_WINDOW_WIDTH);

    return {
      type: "window",
      x1: geo.x1,
      y1: geo.y1,
      x2: geo.x2,
      y2: geo.y2,
      width: Math.hypot(geo.x2 - geo.x1, geo.y2 - geo.y1),
      thickness: wall.thickness ?? DEFAULT_THICKNESS,
      wallId: wall.id,
    };
  },

  buildShape: (x1, y1, x2, y2) => {
    const shapes = getShapes();
    const startProj = findNearestWall(x1, y1, shapes, WALL_SNAP_RADIUS);

    if (!startProj) {
      return {
        type: "window",
        x1, y1, x2, y2,
        width: Math.hypot(x2 - x1, y2 - y1),
        thickness: DEFAULT_THICKNESS,
        wallId: null,
      };
    }

    const wall = startProj.wall;
    const endProj = projectOntoWall(x2, y2, wall);
    const geo = openingGeometryFromDrag(wall, startProj.t, endProj.t, MIN_WINDOW_WIDTH);

    return {
      type: "window",
      x1: geo.x1,
      y1: geo.y1,
      x2: geo.x2,
      y2: geo.y2,
      width: Math.hypot(geo.x2 - geo.x1, geo.y2 - geo.y1),
      thickness: wall.thickness ?? DEFAULT_THICKNESS,
      wallId: wall.id,
    };
  },
};

