import { useToolsStore } from "@/store/tools.store";
import { useTemporalStore, useFloorPlanStore } from "@/store/floor-plan.store";
import { useSelectionStore } from "@/store/selection.store";
import type { SideBarToolsListItem, Tools, NoOneClickTools } from "./tools.types";
import { Button } from "@/components/ui/button";

const ONE_CLICK_TOOLS = new Set<Tools>(["undo", "redo", "delete"]);

const SidebarToolButton = ({ icon, label, tool }: { tool: Tools } & SideBarToolsListItem) => {
  const activeTool = useToolsStore((s) => s.tool);
  const setTool = useToolsStore((s) => s.setTool);

  const undo = useTemporalStore((s) => s.undo);
  const redo = useTemporalStore((s) => s.redo);
  const canUndo = useTemporalStore((s) => s.pastStates.length > 0);
  const canRedo = useTemporalStore((s) => s.futureStates.length > 0);

  const selectedId = useSelectionStore((s) => s.selectedId);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const removeShape = useFloorPlanStore((s) => s.removeShape);

  const onClick = () => {
    if (tool === "undo") undo();
    else if (tool === "redo") redo();
    else if (tool === "delete") {
      if (selectedId) {
        removeShape(selectedId);
        clearSelection();
      }
    } else {
      setTool(tool as NoOneClickTools);
    }
  };

  const isDisabled =
    (tool === "undo" && !canUndo) || (tool === "redo" && !canRedo) || (tool === "delete" && !selectedId);

  const isActive = !ONE_CLICK_TOOLS.has(tool) && activeTool === (tool as NoOneClickTools);

  return (
    <Button onClick={onClick} title={label} variant={isActive ? "default" : "ghost"} size="icon" disabled={isDisabled}>
      {icon}
    </Button>
  );
};

export default SidebarToolButton;
