import { useToolsStore } from "@/store/tools.store";
import { useTemporalStore } from "@/store/floor-plan.store";
import type { SideBarToolsListItem, Tools } from "./tools.types";
import { Button } from "@/components/ui/button";

const SidebarToolButton = ({ icon, label, tool }: { tool: Tools } & SideBarToolsListItem) => {
  const activeTool = useToolsStore((s) => s.tool);
  const setTool = useToolsStore((s) => s.setTool);

  const undo = useTemporalStore((s) => s.undo);
  const redo = useTemporalStore((s) => s.redo);
  const canUndo = useTemporalStore((s) => s.pastStates.length > 0);
  const canRedo = useTemporalStore((s) => s.futureStates.length > 0);

  const onClick = () => {
    if (tool === "undo") undo();
    else if (tool === "redo") redo();
    else setTool(tool);
  };

  const isDisabled = (tool === "undo" && !canUndo) || (tool === "redo" && !canRedo);

  return (
    <Button
      onClick={onClick}
      title={label}
      variant={activeTool === tool ? "default" : "ghost"}
      size="icon"
      disabled={isDisabled}
    >
      {icon}
    </Button>
  );
};

export default SidebarToolButton;
