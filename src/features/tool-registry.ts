import type { ToolDefinition } from "@/core/drawing-engine/tool-definition.types";
import { wallToolDefinition } from "./wall-tool/wall.tool";
import { lineToolDefinition } from "./line-tool/line.tool";
import { dashedLineToolDefinition } from "./dashed-line-tool/dashed-line.tool";
import { textToolDefinition } from "./text-tool/text.tool";
import type { Tools } from "@/renderer/layout/sidebar/tools.types";

export const TOOL_REGISTRY: Record<NonNullable<Tools>, ToolDefinition> = {
  wall: wallToolDefinition,
  line: lineToolDefinition,
  "dashed-line": dashedLineToolDefinition,
  text: textToolDefinition,
};
