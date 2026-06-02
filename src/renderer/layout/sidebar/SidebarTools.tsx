import { Pen, Minus, StretchHorizontal, Type } from "lucide-react";
import type { SideBarToolsList, Tools } from "./tools.types";
import SidebarToolButton from "./SidebarToolButton";

export const tools: SideBarToolsList<NonNullable<Tools>> = {
  wall: { icon: <StretchHorizontal size={16} />, label: "دیوار" },
  line: { icon: <Minus size={16} />, label: "خط" },
  "dashed-line": { icon: <Pen size={16} />, label: "نقطه‌چین" },
  text: { icon: <Type size={16} />, label: "متن" },
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
