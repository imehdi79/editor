import { useToolsStore } from "@/store/tools.store";
import type { SideBarToolsListItem, Tools } from "./tools.types";
import { Button } from "@/components/ui/button";

const SidebarToolButton = ({ icon, tool }: { tool: Tools } & SideBarToolsListItem) => {
  const activeTool = useToolsStore((state) => state.tool);
  const setTool = useToolsStore((state) => state.setTool);

  return (
    <Button
      key={tool}
      onClick={() => setTool(tool)}
      title={tool as string}
      variant={activeTool === tool ? "default" : "ghost"}
      size="icon"
    >
      {icon}
    </Button>
  );
};

export default SidebarToolButton;
