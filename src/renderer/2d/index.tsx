/**
 * 2D Canvas — root renderer.
 *
 * There is exactly ONE <Stage> that lives for the full lifetime of C2D.
 * Tool-conditional content (ghost, selection handles, hints) is rendered
 * inside that single Stage's Layer.
 *
 * Why one Stage?
 *   Three separate <Stage> components (PanLayer / DrawingLayer / SelectionLayer)
 *   unmount and remount on every tool change. Each mount gives useStageViewport
 *   a fresh set of refs (isPanning, lastPinchDist, …) and — crucially — the
 *   stageRef briefly points to null during the transition. The result is that
 *   pan stops working the moment any tool is selected and then deselected.
 *
 * One Stage means:
 *   - stageRef.current is set once and never cleared.
 *   - useStageViewport's refs survive tool changes.
 *   - Viewport state (position, scale) is never reset by a remount.
 */

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

type StageRef = RefObject<Konva.Stage>;

// ---------------------------------------------------------------------------
// Inner canvas — always mounted, reads tool from store internally
// ---------------------------------------------------------------------------

const Canvas = ({ stageRef }: { stageRef: StageRef }) => {
  const tool = useToolsStore((s) => s.tool);
  const { width, height } = useStageSize();
  const { x, y, scale } = useViewportStore();

  // Viewport: pan + zoom. Active for all tool states (wheel always works;
  // left-drag pan only when tool === null — enforced inside the hook).
  const { screenToWorld, viewportEvents } = useStageViewport(stageRef);

  // Drawing engine — only produces shapes when a drawing tool is active.
  // toolDef is null for select/null tools, which makes the engine a no-op.
  const isDrawingTool = tool !== null && tool !== "select";
  const toolDef = isDrawingTool ? (TOOL_REGISTRY[tool] ?? null) : null;
  const {
    ghost,
    hints: drawHints,
    onMouseDown: drawDown,
    onMouseMove: drawMove,
    onMouseUp: drawUp,
  } = useDrawingEngine(toolDef);

  // Selection / transform engine — only meaningful when tool === "select".
  const {
    previewShape,
    connectedPreviews,
    hints: selectHints,
    onMouseDown: selectDown,
    onMouseMove: selectMove,
    onMouseUp: selectUp,
  } = useTransformEngine();

  // Route left-mouse events to the right engine based on active tool.
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

  // Merge tool and viewport mouse handlers — both must fire on every event.
  // viewportEvents handles middle-button pan always, and left-drag when tool===null.
  // toolEvents handles left-click drawing/selection when a tool is active.
  type ME = Konva.KonvaEventObject<MouseEvent>;
  const handleMouseDown = (e: ME) => {
    viewportEvents.onMouseDown(e);
    toolEvents.onMouseDown(e);
  };
  const handleMouseMove = (e: ME) => {
    viewportEvents.onMouseMove(e);
    toolEvents.onMouseMove(e);
  };
  const handleMouseUp = (e: ME) => {
    viewportEvents.onMouseUp(e);
    toolEvents.onMouseUp(e);
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
      onTouchStart={toolEvents.onTouchStart}
      onTouchMove={toolEvents.onTouchMove}
      onTouchEnd={toolEvents.onTouchEnd}
      onWheel={viewportEvents.onWheel}
    >
      <Layer>
        <GridRenderer />
        <ShapeRenderer />
        <DimensionLayerRenderer />

        {/* Ghost — visible only while a drawing tool is active */}
        {isDrawingTool && <GhostRenderer ghost={ghost} />}

        {/* Selection handles — visible only in select mode */}
        {tool === "select" && <SelectionRenderer previewShape={previewShape} connectedPreviews={connectedPreviews} />}

        {/* Hints and live dimension — active for drawing + select tools */}
        {tool !== null && (
          <>
            <HintsRenderer hints={activeHints} />
            <DimensionRenderer hints={activeHints} />
          </>
        )}
      </Layer>
    </Stage>
  );
};

// ---------------------------------------------------------------------------
// Root 2D canvas
// ---------------------------------------------------------------------------

const C2D = () => {
  const tool = useToolsStore((s) => s.tool);
  const stageRef = useRef<Konva.Stage>(null) as StageRef;

  // Cursor follows active tool
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const container = stage.container();
    container.style.cursor = tool === null ? "grab" : (TOOL_CURSORS[tool] ?? "crosshair");
  }, [tool]);

  return (
    <div className="w-svw h-svh relative">
      <Canvas stageRef={stageRef} />
    </div>
  );
};

export default C2D;
