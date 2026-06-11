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
import { buildCandidates } from "./dimensionCollision";
import { resolveCollisions } from "./dimensionCollision";
import type { DimensionCandidate } from "./dimensionCollision";

export const useDimensionLayout = (): DimensionCandidate[] => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const dimensionUnit = useEditorStore((s) => s.dimensionUnit);
  const pixelsPerMeter = useEditorStore((s) => s.pixelsPerMeter);
  const measurementReference = useEditorStore((s) => s.measurementReference);

  return useMemo(() => {
    const candidates = buildCandidates(shapes, dimensionUnit, pixelsPerMeter, measurementReference);
    return resolveCollisions(candidates);
  }, [shapes, dimensionUnit, pixelsPerMeter, measurementReference]);
};
