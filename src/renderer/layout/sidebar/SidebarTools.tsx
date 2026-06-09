import type { SideBarToolsList } from "./tools.types";
import SidebarToolGroup from "./SidebarToolGroup";
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
} from "lucide-react";

const selectionTools: SideBarToolsList<"select"> = {
  select: { icon: <SplinePointer size={16} />, label: "Select" },
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
    <SidebarToolGroup tools={selectionTools} />
    <SidebarToolGroup tools={structureTools} />
    <SidebarToolGroup tools={drawingTools} />
    <SidebarToolGroup tools={actionTools} />
  </div>
);

export default SidebarTools;
