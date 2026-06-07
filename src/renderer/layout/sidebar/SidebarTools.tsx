import type { SideBarToolsList, Tools } from "./tools.types";
import SidebarToolButton from "./SidebarToolButton";
import { Type, BrickWallIcon, Ellipsis, Minus, SplinePointer, Redo, Undo, Trash2 } from "lucide-react";

const drawingTools: SideBarToolsList<"select" | "wall" | "line" | "dashed-line" | "text"> = {
  select: { icon: <SplinePointer size={16} />, label: "Select" },
  wall: { icon: <BrickWallIcon size={16} />, label: "Wall" },
  line: { icon: <Minus size={16} />, label: "Line" },
  "dashed-line": { icon: <Ellipsis size={16} />, label: "Dashed Line" },
  text: { icon: <Type size={16} />, label: "Text" },
};

const actionTools: SideBarToolsList<"undo" | "redo" | "delete"> = {
  undo: { icon: <Undo size={16} />, label: "Undo" },
  redo: { icon: <Redo size={16} />, label: "Redo" },
  delete: { icon: <Trash2 size={16} />, label: "Delete selected" },
};

const SidebarTools = () => {
  return (
    <div className="flex flex-col gap-0.5">
      {Object.entries(drawingTools).map(([tool, props]) => (
        <SidebarToolButton key={tool} tool={tool as Tools} {...props} />
      ))}

      {/* Divider */}
      <div className="my-1 h-px bg-border" />

      {Object.entries(actionTools).map(([tool, props]) => (
        <SidebarToolButton key={tool} tool={tool as Tools} {...props} />
      ))}
    </div>
  );
};

export default SidebarTools;
