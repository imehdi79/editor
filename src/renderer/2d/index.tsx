import { useRef, useEffect, useState, type RefObject } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import { useToolsStore, TOOL_CURSORS } from "@/store/tools.store";
import { useViewportStore } from "@/store/viewport.store";
import { usePointerStore } from "@/store/pointer.store";
import { useSelectionStore } from "@/store/selection.store";
import { useMobileUiStore } from "@/store/mobile-ui.store";
import { useDrawingEngine } from "@/core/drawing-engine/useDrawingEngine";
import { useTransformEngine } from "@/features/select-tool/useTransformEngine";
import { TOOL_REGISTRY } from "@/features/tool-registry";
import ShapeRenderer from "./ShapeRenderer";
import WallIssuesRenderer from "./WallIssuesRenderer";
import SpaceRenderer from "./SpaceRenderer";
import GhostRenderer from "./GhostRenderer";
import HintsRenderer from "./HintsRenderer";
import SelectionRenderer from "./SelectionRenderer";
import GridRenderer from "./GridRenderer";
import { useStageSize } from "./useStageSize";
import { useStageEvents } from "./useStageEvents";
import { useStageViewport } from "./useStageViewport";
import { useViewportZoom } from "./useViewportZoom";
import { useCanvasGestures } from "./useCanvasGestures";
import DimensionRenderer from "./DimensionRenderer";
import DimensionLayerRenderer from "./DimensionLayerRenderer";
import DimensionChainsRenderer from "./DimensionChainsRenderer";
import ArcDimensionRenderer from "./ArcDimensionRenderer";
import DrawingInfoCanvas from "./DrawingInfoCanvas";
import NodeThicknessPopover from "./NodeThicknessPopover";
import DrawingHud from "./DrawingHud";
import DrawCommitBar from "./DrawCommitBar";
import TouchLoupe from "./TouchLoupe";

type StageRef = RefObject<Konva.Stage>;
type ME = Konva.KonvaEventObject<MouseEvent>;
type TE = Konva.KonvaEventObject<TouchEvent>;

const Canvas = ({ stageRef }: { stageRef: StageRef }) => {
  const tool = useToolsStore((s) => s.tool);
  const { width, height } = useStageSize();
  const { x, y, scale } = useViewportStore();
  const setPointerWorld = usePointerStore((s) => s.setWorld);

  // pan-only mode = no tool selected; `select` is the merged select+pan tool.
  const isPanMode = tool === null;
  const isDrawingTool = tool !== null && tool !== "select";
  const toolDef = isDrawingTool ? (TOOL_REGISTRY[tool] ?? null) : null;

  // On-canvas wall thickness editor — opened by tapping a wall node handle.
  const [thicknessNode, setThicknessNode] = useState<{ shapeId: string; handle: "p1" | "p2" } | null>(null);

  // Touch magnifier — { x, y } in client px while a precision gesture is active.
  const [loupe, setLoupe] = useState<{ x: number; y: number } | null>(null);

  const {
    ghost,
    hints: drawHints,
    pending: drawPending,
    confirmPending,
    discardPending,
    onMouseDown: drawDown,
    onMouseMove: drawMove,
    onMouseUp: drawUp,
    cancel: drawCancel,
  } = useDrawingEngine(toolDef);
  const {
    previewShape,
    connectedPreviews,
    hints: selectHints,
    onMouseDown: selectDown,
    onMouseMove: selectMove,
    onMouseUp: selectUp,
    cancel: selectCancel,
    hitTest,
  } = useTransformEngine((shapeId, handle) => setThicknessNode({ shapeId, handle }));

  // Merged select+pan: a single-pointer drag pans only when it starts on empty
  // space (nothing selectable under the pointer); on a shape it transforms.
  const shouldPanAtWorld = (wx: number, wy: number) => (tool === "select" ? !hitTest(wx, wy) : false);
  const { screenToWorld, viewportEvents } = useStageViewport(stageRef, shouldPanAtWorld);

  // A single-finger touch warrants the magnifier when it's a precision gesture:
  // any drawing stroke, or a select-mode grab that lands on a shape (a transform,
  // not an empty-space pan). Never in pan mode, never multi-touch (pinch).
  const wantsLoupe = (clientX: number, clientY: number) => {
    if (isPanMode) return false;
    if (isDrawingTool) return true;
    const rect = stageRef.current?.container().getBoundingClientRect();
    const w = screenToWorld(clientX - (rect?.left ?? 0), clientY - (rect?.top ?? 0));
    return hitTest(w.x, w.y);
  };

  const noop = () => {};
  const activeDown = tool === "select" ? selectDown : isDrawingTool ? drawDown : noop;
  const activeMove = tool === "select" ? selectMove : isDrawingTool ? drawMove : noop;
  const activeUp = tool === "select" ? selectUp : isDrawingTool ? drawUp : noop;
  const activeCancel = tool === "select" ? selectCancel : isDrawingTool ? drawCancel : noop;
  const activeHints = tool === "select" ? selectHints : drawHints;

  const toolEvents = useStageEvents({
    onMouseDown: activeDown,
    onMouseMove: activeMove,
    onMouseUp: activeUp,
    onCancel: activeCancel,
    screenToWorld,
  });

  // Touch gestures — only in select/pan mode so they never hijack drawing/chain
  // taps: double-tap fits the view; long-press opens the selection editor.
  const { fit } = useViewportZoom();
  const openEditor = useMobileUiStore((s) => s.openEditor);
  const gestures = useCanvasGestures({
    enabled: tool === "select" || tool === null,
    onDoubleTap: fit,
    onLongPress: () => {
      if (tool !== "select") return;
      const { selectedId, selectedSpaceId } = useSelectionStore.getState();
      if (selectedId || selectedSpaceId) openEditor();
    },
  });

  // Mouse: viewport always handles middle-button + pan-mode left-drag; tools handle left-button in non-pan modes
  const handleMouseDown = (e: ME) => {
    viewportEvents.onMouseDown(e);
    if (!isPanMode) toolEvents.onMouseDown(e);
  };
  const handleMouseMove = (e: ME) => {
    viewportEvents.onMouseMove(e);
    // Live coordinate readout for the status bar (world space, transform-aware).
    const world = e.target.getStage()?.getRelativePointerPosition();
    if (world) setPointerWorld({ x: world.x, y: world.y });
    if (!isPanMode) toolEvents.onMouseMove(e);
  };
  const handleMouseLeave = () => {
    viewportEvents.onMouseLeave();
    setPointerWorld(null);
  };
  const handleMouseUp = (e: ME) => {
    viewportEvents.onMouseUp(e);
    if (!isPanMode) toolEvents.onMouseUp(e);
  };

  // Touch: viewport owns all touch in pan mode (single=pan, double=pinch); tools own single touch in drawing/select mode with pinch still going to viewport
  const handleTouchStart = (e: TE) => {
    viewportEvents.onTouchStart(e);
    if (!isPanMode) toolEvents.onTouchStart(e);
    gestures.onTouchStart(e);
    const t = e.evt.touches.length === 1 ? e.evt.touches[0] : null;
    setLoupe(t && wantsLoupe(t.clientX, t.clientY) ? { x: t.clientX, y: t.clientY } : null);
  };
  const handleTouchMove = (e: TE) => {
    viewportEvents.onTouchMove(e);
    if (!isPanMode && e.evt.touches.length === 1) toolEvents.onTouchMove(e);
    gestures.onTouchMove(e);
    if (e.evt.touches.length !== 1) setLoupe(null); // a 2nd finger ⇒ pinch, not precision
    else {
      const t = e.evt.touches[0];
      setLoupe((prev) => (prev ? { x: t.clientX, y: t.clientY } : prev)); // track only if already active
    }
  };
  const handleTouchEnd = (e: TE) => {
    viewportEvents.onTouchEnd(e);
    if (!isPanMode) toolEvents.onTouchEnd(e);
    gestures.onTouchEnd(e);
    setLoupe(null);
  };

  return (
    <>
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
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={viewportEvents.onWheel}
      >
        <Layer>
          <GridRenderer />
          <SpaceRenderer />
          <ShapeRenderer />
          <WallIssuesRenderer />
          <DimensionLayerRenderer />
          <DimensionChainsRenderer />
          <ArcDimensionRenderer />
          <DrawingInfoCanvas />
          {isDrawingTool && <GhostRenderer ghost={ghost} />}
          {tool === "select" && <SelectionRenderer previewShape={previewShape} connectedPreviews={connectedPreviews} />}
          {tool !== null && (
            <>
              <HintsRenderer hints={activeHints} />
              <DimensionRenderer hints={activeHints} />
            </>
          )}
        </Layer>
      </Stage>

      {/* Mobile DOM overlay — off-finger readout of the live drawing state */}
      {tool !== null && <DrawingHud hints={activeHints} />}

      {/* Touch deferred-commit — confirm/discard the held segment */}
      {isDrawingTool && drawPending && <DrawCommitBar onConfirm={confirmPending} onDiscard={discardPending} />}

      {/* Touch magnifier — precise placement while a finger covers the point */}
      {loupe && <TouchLoupe x={loupe.x} y={loupe.y} stageRef={stageRef} />}

      {/* DOM overlay — wall thickness editor anchored at a tapped node */}
      {tool === "select" && thicknessNode && (
        <NodeThicknessPopover
          shapeId={thicknessNode.shapeId}
          handle={thicknessNode.handle}
          onClose={() => setThicknessNode(null)}
        />
      )}
    </>
  );
};

const C2D = () => {
  const tool = useToolsStore((s) => s.tool);
  const stageRef = useRef<Konva.Stage>(null) as StageRef;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // No tool = pan-only (grab cursor); any tool (incl. merged select) uses its
    // own cursor — the grabbing cursor during an empty-space pan is set in useStageViewport.
    stage.container().style.cursor = tool === null ? "grab" : (TOOL_CURSORS[tool] ?? "crosshair");
  }, [tool]);

  return (
    <div className="w-svw h-svh relative">
      <Canvas stageRef={stageRef} />
    </div>
  );
};

export default C2D;
