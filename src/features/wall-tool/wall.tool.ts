import type { ToolDefinition } from "@/core/drawing-engine/tool-definition.types";
import { useEditorStore } from "@/store/editor.store";

const wallDefaults = () => {
  const { defaultWallThickness, defaultWallHeight } = useEditorStore.getState();
  return { thickness: defaultWallThickness, height: defaultWallHeight };
};

export const wallToolDefinition: ToolDefinition = {
  minLength: 10,

  buildGhost: (x1, y1, x2, y2) => ({
    type: "wall",
    x1,
    y1,
    x2,
    y2,
    ...wallDefaults(),
  }),

  buildShape: (x1, y1, x2, y2) => ({
    type: "wall",
    x1,
    y1,
    x2,
    y2,
    ...wallDefaults(),
  }),
};
