import { Stage, Layer } from "react-konva";
import { useToolsStore } from "@/store/tools.store";
import { useDrawingEngine } from "@/core/drawing-engine/useDrawingEngine";
import { useTransformEngine } from "@/features/select-tool/useTransformEngine";
import { TOOL_REGISTRY } from "@/features/tool-registry";
import ShapeRenderer from "./ShapeRenderer";
import GhostRenderer from "./GhostRenderer";
import HintsRenderer from "./HintsRenderer";
import SelectionRenderer from "./SelectionRenderer";
import GridRenderer from "./GridRenderer";
import { useStageSize } from "./useStageSize";
import { useStageEvents } from "./useStageEvents";
import DimensionRenderer from "./DimensionRenderer";
import ShapeDimensionsRenderer from "./ShapeDimensionsRenderer";

// ---------------------------------------------------------------------------
// Drawing layer — active for all shape-drawing tools
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
        <GridRenderer />
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
// Selection layer — active for the select tool
// Handles move, resize, rotate via useTransformEngine.
// ---------------------------------------------------------------------------

const SelectionLayer = () => {
  const { previewShape, hints, onMouseDown, onMouseMove, onMouseUp } = useTransformEngine();
  const events = useStageEvents({ onMouseDown, onMouseMove, onMouseUp });
  const { width, height } = useStageSize();

  return (
    <Stage width={width} height={height} {...events}>
      <Layer>
        <GridRenderer />
        <ShapeRenderer />
        <ShapeDimensionsRenderer />
        <SelectionRenderer previewShape={previewShape} />
        <HintsRenderer hints={hints} />
        <DimensionRenderer hints={hints} />
      </Layer>
    </Stage>
  );
};

// ---------------------------------------------------------------------------
// Root 2D canvas
// ---------------------------------------------------------------------------

const C2D = () => {
  const tool = useToolsStore((s) => s.tool);
  if (tool === "select") return <SelectionLayer />;
  return <DrawingLayer tool={tool ?? "wall"} />;
};

export default C2D;
