/**
 * editorTools — the shared list of mode tools (select/draw), used by both the
 * desktop tool rail and the mobile tool sheet so the toolset stays in one place.
 */

import {
  Type,
  BrickWallIcon,
  Spline,
  Ellipsis,
  Minus,
  SplinePointer,
  DoorOpen,
  AppWindowMac,
  type LucideIcon,
} from "lucide-react";
import type { NoOneClickTools } from "../sidebar/tools.types";
import type { TranslationKey } from "@/i18n";

export const MODE_TOOLS: { tool: NoOneClickTools; Icon: LucideIcon; labelKey: TranslationKey }[] = [
  { tool: "select", Icon: SplinePointer, labelKey: "tools.select" },
  { tool: "wall", Icon: BrickWallIcon, labelKey: "tools.wall" },
  { tool: "arc-wall", Icon: Spline, labelKey: "tools.arcWall" },
  { tool: "window", Icon: AppWindowMac, labelKey: "tools.window" },
  { tool: "door", Icon: DoorOpen, labelKey: "tools.door" },
  { tool: "line", Icon: Minus, labelKey: "tools.line" },
  { tool: "dashed-line", Icon: Ellipsis, labelKey: "tools.dashedLine" },
  { tool: "text", Icon: Type, labelKey: "tools.text" },
];
