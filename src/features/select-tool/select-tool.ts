/**
 * selectToolDefinition — minimal stub that satisfies ToolDefinition so the
 * tool registry compiles. The actual select-tool behaviour is handled by
 * useSelectionEngine, not by useDrawingEngine.
 *
 * buildGhost and buildShape will never be called for this tool because
 * C2D routes the `select` tool to useSelectionEngine before reaching
 * useDrawingEngine.
 */
import type { ToolDefinition } from "@/core/drawing-engine/tool-definition.types";

export const selectToolDefinition: ToolDefinition = {
  minLength: 0,
  buildGhost: () => null,
  buildShape: () => ({ type: "line", x1: 0, y1: 0, x2: 0, y2: 0 }),
};
