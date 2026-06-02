import { Pen } from "lucide-react";
import type { SideBarToolsList, Tools } from "./tools.types";
import SidebarToolButton from "./SidebarToolButton";

export const tools: SideBarToolsList<NonNullable<Tools>> = {
  pen: {
    icon: <Pen size={16} />,
  },
};

const SidebarTools = () => {
  return (
    <div className="flex flex-col">
      {Object.entries(tools).map(([tool, props]) => (
        <SidebarToolButton tool={tool as Tools} {...props} />
      ))}
    </div>
  );
};

export default SidebarTools;
