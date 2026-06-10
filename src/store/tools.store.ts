import type { NoOneClickTools } from "@/renderer/layout/sidebar/tools.types";
import { create } from "zustand";

export const TOOL_CURSORS: Record<NoOneClickTools, string> = {
  wall: "crosshair",
  line: "crosshair",
  "dashed-line": "crosshair",
  text: "text",
  select: "default",
  pan: "grab",
  door: "crosshair",
  window: "crosshair",
};
interface ToolsStore {
  tool: NoOneClickTools | null;
  setTool: (tool: NoOneClickTools | null) => void;
}

export const useToolsStore = create<ToolsStore>((set, get) => ({
  tool: null,
  setTool: (tool) => set({ tool: get().tool === tool ? null : tool }),
}));
