import type { ToolDefinition } from "@/core/drawing-engine/tool-definition.types";
import { wallToolDefinition } from "./wall-tool/wall.tool";
import { lineToolDefinition } from "./line-tool/line.tool";
import { dashedLineToolDefinition } from "./dashed-line-tool/dashed-line.tool";
import { textToolDefinition } from "./text-tool/text.tool";
import type { NoOneClickTools } from "@/renderer/layout/sidebar/tools.types";
import { selectToolDefinition } from "./select-tool/select-tool";
import { windowToolDefinition } from "./window-tool/window.tool";
import { doorToolDefinition } from "./door-tool/door.tool";

export const TOOL_REGISTRY: Record<NoOneClickTools, ToolDefinition> = {
  wall: wallToolDefinition,
  line: lineToolDefinition,
  "dashed-line": dashedLineToolDefinition,
  text: textToolDefinition,
  select: selectToolDefinition,
  window: windowToolDefinition,
  door: doorToolDefinition,
};

