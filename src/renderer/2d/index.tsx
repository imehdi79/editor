import { useRef, useEffect, type RefObject } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import { useToolsStore, TOOL_CURSORS } from "@/store/tools.store";
import { useViewportStore } from "@/store/viewport.store";
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
import { useStageViewport } from "./useStageViewport";
import DimensionRenderer from "./DimensionRenderer";
import DimensionLayerRenderer from "./DimensionLayerRenderer";
import DimensionChainsRenderer from "./DimensionChainsRenderer";

type StageRef = RefObject<Konva.Stage>;
type ME = Konva.KonvaEventObject<MouseEvent>;
type TE = Konva.KonvaEventObject<TouchEvent>;

const Canvas = ({ stageRef }: { stageRef: StageRef }) => {
  const tool = useToolsStore((s) => s.tool);
  const { width, height } = useStageSize();
  const { x, y, scale } = useViewportStore();
  const { screenToWorld, viewportEvents } = useStageViewport(stageRef);

  const isPanMode = tool === null || tool === "pan";
  const isDrawingTool = tool !== null && tool !== "select" && tool !== "pan";
  const toolDef = isDrawingTool ? (TOOL_REGISTRY[tool] ?? null) : null;

  const {
    ghost,
    hints: drawHints,
    onMouseDown: drawDown,
    onMouseMove: drawMove,
    onMouseUp: drawUp,
  } = useDrawingEngine(toolDef);
  const {
    previewShape,
    connectedPreviews,
    hints: selectHints,
    onMouseDown: selectDown,
    onMouseMove: selectMove,
    onMouseUp: selectUp,
  } = useTransformEngine();

  const activeDown = tool === "select" ? selectDown : isDrawingTool ? drawDown : () => {};
  const activeMove = tool === "select" ? selectMove : isDrawingTool ? drawMove : () => {};
  const activeUp = tool === "select" ? selectUp : isDrawingTool ? drawUp : () => {};
  const activeHints = tool === "select" ? selectHints : drawHints;

  const toolEvents = useStageEvents({
    onMouseDown: activeDown,
    onMouseMove: activeMove,
    onMouseUp: activeUp,
    screenToWorld,
  });

  // Mouse: viewport always handles middle-button + pan-mode left-drag; tools handle left-button in non-pan modes
  const handleMouseDown = (e: ME) => {
    viewportEvents.onMouseDown(e);
    if (!isPanMode) toolEvents.onMouseDown(e);
  };
  const handleMouseMove = (e: ME) => {
    viewportEvents.onMouseMove(e);
    if (!isPanMode) toolEvents.onMouseMove(e);
  };
  const handleMouseUp = (e: ME) => {
    viewportEvents.onMouseUp(e);
    if (!isPanMode) toolEvents.onMouseUp(e);
  };

  // Touch: viewport owns all touch in pan mode (single=pan, double=pinch); tools own single touch in drawing/select mode with pinch still going to viewport
  const handleTouchStart = (e: TE) => {
    viewportEvents.onTouchStart(e);
    if (!isPanMode) toolEvents.onTouchStart(e);
  };
  const handleTouchMove = (e: TE) => {
    viewportEvents.onTouchMove(e);
    if (!isPanMode && e.evt.touches.length === 1) toolEvents.onTouchMove(e);
  };
  const handleTouchEnd = (e: TE) => {
    viewportEvents.onTouchEnd(e);
    if (!isPanMode) toolEvents.onTouchEnd(e);
  };

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      x={x}
      y={y}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={viewportEvents.onMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={viewportEvents.onWheel}
    >
      <Layer>
        <GridRenderer />
        <ShapeRenderer />
        <DimensionLayerRenderer />
        <DimensionChainsRenderer />
        {isDrawingTool && <GhostRenderer ghost={ghost} />}
        {tool === "select" && <SelectionRenderer previewShape={previewShape} connectedPreviews={connectedPreviews} />}
        {tool !== null && tool !== "pan" && (
          <>
            <HintsRenderer hints={activeHints} />
            <DimensionRenderer hints={activeHints} />
          </>
        )}
      </Layer>
    </Stage>
  );
};

const C2D = () => {
  const tool = useToolsStore((s) => s.tool);
  const stageRef = useRef<Konva.Stage>(null) as StageRef;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const isPanMode = tool === null || tool === "pan";
    stage.container().style.cursor = isPanMode ? "grab" : (TOOL_CURSORS[tool!] ?? "crosshair");
  }, [tool]);

  return (
    <div className="w-svw h-svh relative">
      <Canvas stageRef={stageRef} />
    </div>
  );
};

export default C2D;
