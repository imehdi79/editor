import type { SideBarToolsList } from "./tools.types";
import SidebarToolGroup from "./SidebarToolGroup";
import SidebarToolMenu from "./SidebarToolMenu";
import SettingsPanel from "./SettingsPanel";
import {
  Type,
  BrickWallIcon,
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
  select: { icon: <SplinePointer size={16} />, label: "Select" },
  pan: { icon: <Hand size={16} />, label: "Pan" },
};

const structureTools: SideBarToolsList<"wall" | "window" | "door"> = {
  wall: { icon: <BrickWallIcon size={16} />, label: "Wall" },
  window: { icon: <AppWindowMac size={16} />, label: "Window" },
  door: { icon: <DoorOpen size={16} />, label: "Door" },
};

const drawingTools: SideBarToolsList<"line" | "dashed-line" | "text"> = {
  line: { icon: <Minus size={16} />, label: "Line" },
  "dashed-line": { icon: <Ellipsis size={16} />, label: "Dashed Line" },
  text: { icon: <Type size={16} />, label: "Text" },
};

const actionTools: SideBarToolsList<"undo" | "redo" | "delete"> = {
  undo: { icon: <Undo size={16} />, label: "Undo", variant: "ghost" },
  redo: { icon: <Redo size={16} />, label: "Redo", variant: "ghost" },
  delete: { icon: <Trash2 size={16} />, label: "Delete selected", variant: "destructive" },
};

const SidebarTools = () => (
  <div className="flex flex-col gap-2">
    {/* Select + Pan — always visible */}
    <SidebarToolGroup tools={navigationTools} />

    {/* Structure tools — collapsed to icon menu */}
    <div className="flex flex-col gap-0.5 bg-popover p-1 rounded-lg border shadow-2xl">
      <SidebarToolMenu groupIcon={<Layers size={16} />} tools={structureTools} tooltip="Structure" />
    </div>

    {/* Drawing tools — collapsed to icon menu */}
    <div className="flex flex-col gap-0.5 bg-popover p-1 rounded-lg border shadow-2xl">
      <SidebarToolMenu groupIcon={<PenLine size={16} />} tools={drawingTools} tooltip="Drawing" />
    </div>

    {/* Action tools */}
    <SidebarToolGroup tools={actionTools} />

    {/* Settings */}
    <div className="flex flex-col gap-0.5 bg-popover p-1 rounded-lg border shadow-2xl">
      <SettingsPanel />
    </div>
  </div>
);

export default SidebarTools;
