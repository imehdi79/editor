/**
 * useSetNodeJoin — set the join style at ONE wall node.
 *
 * A junction is a property of the node, shared by every wall meeting there, so
 * the override is written onto each wall endpoint at that node (joinP1/joinP2).
 * Changing one node therefore updates all of its connected walls at once; the
 * junction geometry then reads the node's override, falling back to the global
 * `wallJoinStyle` default when none is set.
 */

import { useFloorPlanStore } from "@/store/floor-plan.store";
import { computeTopology, nodeKey } from "@/core/topology/computeTopology";
import type { JoinStyle, ShapeId } from "@/core/drawing-engine/drawing.types";

export const useSetNodeJoin = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const updateShape = useFloorPlanStore((s) => s.updateShape);

  return (wallId: ShapeId, handle: "p1" | "p2", style: JoinStyle) => {
    const wall = shapes[wallId];
    if (wall?.type !== "wall") return;

    const x = handle === "p1" ? wall.x1 : wall.x2;
    const y = handle === "p1" ? wall.y1 : wall.y2;
    const node = computeTopology(shapes).get(nodeKey(x, y));

    // Apply to every wall endpoint sharing the node (the connected walls). A
    // free end with no topology node still updates the tapped wall itself.
    const targets = node
      ? node.refs.filter((ref) => shapes[ref.shapeId]?.type === "wall")
      : [{ shapeId: wallId, handle }];

    for (const ref of targets) {
      updateShape(ref.shapeId, ref.handle === "p1" ? { joinP1: style } : { joinP2: style });
    }
  };
};
