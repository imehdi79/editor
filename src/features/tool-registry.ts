import type { ToolDefinition } from "@/core/drawing-engine/tool-definition.types";
import { wallToolDefinition } from "./wall-tool/wall.tool";
import { arcWallToolDefinition } from "./arc-wall-tool/arc-wall.tool";
import { lineToolDefinition } from "./line-tool/line.tool";
import { dashedLineToolDefinition } from "./dashed-line-tool/dashed-line.tool";
import { textToolDefinition } from "./text-tool/text.tool";
import type { NoOneClickTools } from "@/renderer/layout/sidebar/tools.types";
import { selectToolDefinition } from "./select-tool/select-tool";
import { windowToolDefinition } from "./window-tool/window.tool";
import { doorToolDefinition } from "./door-tool/door.tool";

// Pan tool has no drawing behaviour — viewport handles all interaction
const panToolDefinition: ToolDefinition = {
  buildGhost: () => null,
  buildShape: (x1, y1, x2, y2) => ({ type: "line", x1, y1, x2, y2 }),
};

export const TOOL_REGISTRY: Record<NoOneClickTools, ToolDefinition> = {
  wall: wallToolDefinition,
  "arc-wall": arcWallToolDefinition,
  line: lineToolDefinition,
  "dashed-line": dashedLineToolDefinition,
  text: textToolDefinition,
  select: selectToolDefinition,
  window: windowToolDefinition,
  door: doorToolDefinition,
  pan: panToolDefinition,
};

