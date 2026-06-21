import type { NoOneClickTools } from "@/renderer/layout/sidebar/tools.types";
import { create } from "zustand";

export const TOOL_CURSORS: Record<NoOneClickTools, string> = {
  wall: "crosshair",
  "arc-wall": "crosshair",
  line: "crosshair",
  "dashed-line": "crosshair",
  text: "text",
  // `select` is the merged select+pan tool: it selects/transforms shapes and
  // pans the canvas when an empty-space drag begins (see useStageViewport).
  select: "default",
  door: "crosshair",
  window: "crosshair",
};
interface ToolsStore {
  tool: NoOneClickTools | null;
  setTool: (tool: NoOneClickTools | null) => void;
}

export const useToolsStore = create<ToolsStore>((set, get) => ({
  // Start in the merged select+pan tool so the canvas is interactive on load.
  tool: "select",
  setTool: (tool) => set({ tool: get().tool === tool ? null : tool }),
}));
