import type { Tools } from "@/renderer/layout/sidebar/tools.types";
import { create } from "zustand";

interface ToolsStore {
  tool: Tools;

  setTool: (tool: Tools) => void;
}

export const useToolsStore = create<ToolsStore>((set, get) => ({
  tool: null,

  setTool: (tool) => set({ tool: get().tool === tool ? null : tool }),
}));
