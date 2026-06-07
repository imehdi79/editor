import { useToolsStore } from "@/store/tools.store";
import type { OneClickTools, SideBarToolsListItem, Tools } from "./tools.types";
import { Button } from "@/components/ui/button";

function isOneClickTool(tool: Tools): tool is OneClickTools {
  return tool === "redo" || tool === "undo";
}

const SidebarToolButton = ({ icon, label, tool }: { tool: Tools } & SideBarToolsListItem) => {
  const activeTool = useToolsStore((s) => s.tool);
  const setTool = useToolsStore((s) => s.setTool);

  const onClick = () => {
    if (isOneClickTool(tool)) {
      console.log("on click tools");
    } else {
      setTool(tool);
    }
  };

  return (
    <Button onClick={onClick} title={label} variant={activeTool === tool ? "default" : "ghost"} size="icon">
      {icon}
    </Button>
  );
};

export default SidebarToolButton;
