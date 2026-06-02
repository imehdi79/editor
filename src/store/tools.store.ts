import type { Tools } from "@/renderer/layout/sidebar/tools.types";
import { create } from "zustand";

export const TOOL_CURSORS: Record<NonNullable<Tools>, string> = {
  wall: "crosshair",
  line: "crosshair",
  "dashed-line": "crosshair",
  text: "text",
};

interface ToolsStore {
  tool: Tools;
  setTool: (tool: Tools) => void;
}

export const useToolsStore = create<ToolsStore>((set, get) => ({
  tool: null,
  setTool: (tool) => set({ tool: get().tool === tool ? null : tool }),
}));
