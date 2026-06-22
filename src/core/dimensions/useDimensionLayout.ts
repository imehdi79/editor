/**
 * useDimensionLayout — Layer 4 of the dimension system.
 *
 * React hook that:
 *   1. Subscribes to the floor-plan and editor stores
 *   2. Runs Layers 1-3 (geometry → layout → collision resolution)
 *   3. Returns a stable array of resolved DimensionCandidates
 *
 * The heavy computation (O(n²) collision passes) is memoized: it only re-runs
 * when shapes, dimensionUnit, or pixelsPerMeter change.
 */

import { useMemo } from "react";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { useViewportStore } from "@/store/viewport.store";
import { buildCandidates } from "./dimensionCollision";
import { resolveCollisions } from "./dimensionCollision";
import type { DimensionCandidate } from "./dimensionCollision";
import { dimensionPxScale } from "./dimensionLayout";
import { computeWallOutlines } from "@/core/wall-junctions";
import { finishedWallShapes } from "@/core/wall-layers/finishedWall";

export const useDimensionLayout = (): DimensionCandidate[] => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const dimensionUnit = useEditorStore((s) => s.dimensionUnit);
  const pixelsPerMeter = useEditorStore((s) => s.pixelsPerMeter);
  const measurementReference = useEditorStore((s) => s.measurementReference);
  const pxScale = useViewportStore((s) => dimensionPxScale(s.scale));
  // Inner/outer references measure to the true mitred faces — share the cached
  // wall outlines so the dimension matches what is drawn.
  const joinStyle = useEditorStore((s) => s.wallJoinStyle);
  const miterLimit = useEditorStore((s) => s.miterLimit);
  const endCap = useEditorStore((s) => s.wallEndCap);
  const align = useEditorStore((s) => s.junctionAlign);

  return useMemo(() => {
    const config = { joinStyle, miterLimit, endCap, align };
    // inner/outer measure the FINISHED faces (core + finish layers) → use the
    // finished-build-up outline; "core" measures the structural slab → the plain
    // core outline; centerline needs no outline.
    const outlines =
      measurementReference === "centerline"
        ? undefined
        : measurementReference === "core"
          ? computeWallOutlines(shapes, config)
          : computeWallOutlines(finishedWallShapes(shapes), config);
    const candidates = buildCandidates(shapes, dimensionUnit, pixelsPerMeter, measurementReference, pxScale, outlines);
    return resolveCollisions(candidates, pxScale);
  }, [shapes, dimensionUnit, pixelsPerMeter, measurementReference, pxScale, joinStyle, miterLimit, endCap, align]);
};
