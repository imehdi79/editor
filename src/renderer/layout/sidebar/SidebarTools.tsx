import type { SideBarToolsList, Tools } from "./tools.types";
import SidebarToolButton from "./SidebarToolButton";
import { Type, BrickWallIcon, Ellipsis, Minus, SplinePointer, Redo, Undo } from "lucide-react";

export const tools: SideBarToolsList<NonNullable<Tools>> = {
  select: {
    icon: <SplinePointer size={16} />,
    label: "Select",
  },
  wall: {
    icon: <BrickWallIcon size={16} />,
    label: "Wall",
  },
  line: {
    icon: <Minus size={16} />,
    label: "Line",
  },
  "dashed-line": {
    icon: <Ellipsis size={16} />,
    label: "Dashed Line",
  },
  text: {
    icon: <Type size={16} />,
    label: "Text",
  },
  redo: {
    icon: <Redo size={16} />,
    label: "Redo",
  },
  undo: {
    icon: <Undo size={16} />,
    label: "Undo",
  },
};

const SidebarTools = () => {
  return (
    <div className="flex flex-col gap-0.5">
      {Object.entries(tools).map(([tool, props]) => (
        <SidebarToolButton key={tool} tool={tool as Tools} {...props} />
      ))}
    </div>
  );
};

export default SidebarTools;
