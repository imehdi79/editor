import type { SideBarToolsList } from "./tools.types";
import SidebarToolGroup from "./SidebarToolGroup";
import SidebarToolMenu from "./SidebarToolMenu";
import SettingsPanel from "./SettingsPanel";
import SystemsPanel from "./SystemsPanel";
import { useTranslation } from "@/i18n";
import {
  Type,
  BrickWallIcon,
  Spline,
  Ellipsis,
  Minus,
  SplinePointer,
  Redo,
  Undo,
  Trash2,
  DoorOpen,
  AppWindowMac,
  Hand,
  Layers,
  PenLine,
} from "lucide-react";

// Select and Pan are always-visible bare buttons
const navigationTools: SideBarToolsList<"select" | "pan"> = {
  select: { icon: <SplinePointer size={16} />, labelKey: "tools.select" },
  pan: { icon: <Hand size={16} />, labelKey: "tools.pan" },
};

const structureTools: SideBarToolsList<"wall" | "arc-wall" | "window" | "door"> = {
  wall: { icon: <BrickWallIcon size={16} />, labelKey: "tools.wall" },
  "arc-wall": { icon: <Spline size={16} />, labelKey: "tools.arcWall" },
  window: { icon: <AppWindowMac size={16} />, labelKey: "tools.window" },
  door: { icon: <DoorOpen size={16} />, labelKey: "tools.door" },
};

const drawingTools: SideBarToolsList<"line" | "dashed-line" | "text"> = {
  line: { icon: <Minus size={16} />, labelKey: "tools.line" },
  "dashed-line": { icon: <Ellipsis size={16} />, labelKey: "tools.dashedLine" },
  text: { icon: <Type size={16} />, labelKey: "tools.text" },
};

const actionTools: SideBarToolsList<"undo" | "redo" | "delete"> = {
  undo: { icon: <Undo size={16} />, labelKey: "tools.undo", variant: "ghost" },
  redo: { icon: <Redo size={16} />, labelKey: "tools.redo", variant: "ghost" },
  delete: { icon: <Trash2 size={16} />, labelKey: "tools.delete", variant: "destructive" },
};

const SidebarTools = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      {/* Select + Pan — always visible */}
      <SidebarToolGroup tools={navigationTools} />

      {/* Structure tools — collapsed to icon menu */}
      <div className="flex flex-col gap-0.5 bg-popover p-1 rounded-lg border shadow-2xl">
        <SidebarToolMenu groupIcon={<Layers size={16} />} tools={structureTools} tooltip={t("tools.structure")} />
      </div>

      {/* Drawing tools — collapsed to icon menu */}
      <div className="flex flex-col gap-0.5 bg-popover p-1 rounded-lg border shadow-2xl">
        <SidebarToolMenu groupIcon={<PenLine size={16} />} tools={drawingTools} tooltip={t("tools.drawing")} />
      </div>

      {/* Action tools */}
      <SidebarToolGroup tools={actionTools} />

      {/* Systems / layers + Settings */}
      <div className="flex flex-col gap-0.5 bg-popover p-1 rounded-lg border shadow-2xl">
        <SystemsPanel />
        <SettingsPanel />
      </div>
    </div>
  );
};

export default SidebarTools;
