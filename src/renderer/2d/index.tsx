import { Stage, Layer } from "react-konva";
import { useToolsStore } from "@/store/tools.store";
import { useDrawingEngine } from "@/core/drawing-engine/useDrawingEngine";
import { useSelectionEngine } from "@/features/select-tool/useSelectionEngine";
import { TOOL_REGISTRY } from "@/features/tool-registry";
import ShapeRenderer from "./ShapeRenderer";
import GhostRenderer from "./GhostRenderer";
import HintsRenderer from "./HintsRenderer";
import SelectionRenderer from "./SelectionRenderer";
import { useStageSize } from "./useStageSize";
import { useStageEvents } from "./useStageEvents";
import DimensionRenderer from "./DimensionRenderer";
import ShapeDimensionsRenderer from "./ShapeDimensionsRenderer";

// ---------------------------------------------------------------------------
// Drawing sub-canvas — active for all tools that draw shapes
// ---------------------------------------------------------------------------

const DrawingLayer = ({
  tool,
}: {
  tool: Exclude<ReturnType<typeof useToolsStore.getState>["tool"], "select" | null>;
}) => {
  const toolDef = TOOL_REGISTRY[tool] ?? null;
  const { ghost, hints, onMouseDown, onMouseMove, onMouseUp } = useDrawingEngine(toolDef);
  const events = useStageEvents({ onMouseDown, onMouseMove, onMouseUp });
  const { width, height } = useStageSize();

  return (
    <Stage width={width} height={height} {...events}>
      <Layer>
        <ShapeRenderer />
        <ShapeDimensionsRenderer />
        <GhostRenderer ghost={ghost} />
        <HintsRenderer hints={hints} />
        <DimensionRenderer hints={hints} />
      </Layer>
    </Stage>
  );
};

// ---------------------------------------------------------------------------
// Selection sub-canvas — active only for the select tool
// ---------------------------------------------------------------------------

const SelectionLayer = () => {
  const { onMouseDown, onMouseMove, onMouseUp } = useSelectionEngine();
  const events = useStageEvents({ onMouseDown, onMouseMove, onMouseUp });
  const { width, height } = useStageSize();

  return (
    <Stage width={width} height={height} {...events}>
      <Layer>
        <ShapeRenderer />
        <ShapeDimensionsRenderer />
        <SelectionRenderer />
      </Layer>
    </Stage>
  );
};

// ---------------------------------------------------------------------------
// Root 2D canvas — routes to the correct interaction layer
// ---------------------------------------------------------------------------

const C2D = () => {
  const tool = useToolsStore((s) => s.tool);

  if (tool === "select") return <SelectionLayer />;

  return <DrawingLayer tool={tool ?? "wall"} />;
};

export default C2D;
