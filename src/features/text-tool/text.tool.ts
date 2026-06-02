import type { ToolDefinition } from "@/core/drawing-engine/tool-definition.types";

export const textToolDefinition: ToolDefinition = {
  minLength: 0,

  buildGhost: (x1, y1) => ({
    type: "text",
    x: x1,
    y: y1,
    content: "متن...",
  }),

  buildShape: (x1, y1) => ({
    type: "text",
    x: x1,
    y: y1,
    content: "متن...",
  }),
};
