import type { ToolDefinition } from "@/core/drawing-engine/tool-definition.types";
import { useEditorStore } from "@/store/editor.store";

const wallDefaults = () => {
  const { defaultWallThickness, defaultWallHeight } = useEditorStore.getState();
  return { thickness: defaultWallThickness, height: defaultWallHeight };
};

/** Default bulge for a freshly drawn arc: a quarter of the chord, bowing left. */
const defaultBulge = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1) * 0.25;

export const arcWallToolDefinition: ToolDefinition = {
  minLength: 10,

  buildGhost: (x1, y1, x2, y2) => ({
    type: "arc-wall",
    x1,
    y1,
    x2,
    y2,
    bulge: defaultBulge(x1, y1, x2, y2),
    ...wallDefaults(),
  }),

  buildShape: (x1, y1, x2, y2) => ({
    type: "arc-wall",
    x1,
    y1,
    x2,
    y2,
    bulge: defaultBulge(x1, y1, x2, y2),
    ...wallDefaults(),
  }),
};
