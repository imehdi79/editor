/**
 * useDimensionChains — React hook that builds inner/outer dimension chains.
 *
 * Subscribes to the floor-plan and editor stores and returns the resolved
 * ChainSegment array, memoized so it only re-runs on shape/unit changes.
 */

import { useMemo } from "react";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { buildDimensionChains, type ChainSegment } from "./dimensionChains";

export const useDimensionChains = (): ChainSegment[] => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const dimensionUnit = useEditorStore((s) => s.dimensionUnit);
  const pixelsPerMeter = useEditorStore((s) => s.pixelsPerMeter);

  return useMemo(
    () => buildDimensionChains(shapes, dimensionUnit, pixelsPerMeter),
    [shapes, dimensionUnit, pixelsPerMeter],
  );
};
