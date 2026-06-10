/**
 * GridRenderer — viewport-aware background grid.
 *
 * The grid tiles in world space so lines stay fixed to world coordinates
 * regardless of pan and zoom. When the stage is panned, grid lines don't
 * drift — the same world-coordinate lines remain visible.
 *
 * Implementation:
 *   Konva Shapes inside a Layer inherit the stage transform, so their
 *   sceneFunc receives a context that is already in world space. We just
 *   need to know the visible world-space rectangle (derived from the
 *   viewport store) to know where to start and stop drawing lines.
 *
 *   visibleMinX = (0 - stageX) / scale
 *   visibleMinY = (0 - stageY) / scale
 *   visibleMaxX = (screenW - stageX) / scale
 *   visibleMaxY = (screenH - stageY) / scale
 *
 *   Then snap the start to the nearest grid line and iterate.
 *
 * Minor grid lines: every `step` world units.
 * Major grid lines: every MAJOR_EVERY minor cells.
 *
 * The grid fades out its density at low zoom so it never becomes a
 * pixel-level mush: `step` is doubled until it renders at ≥8 screen pixels.
 */

import { Shape } from "react-konva";
import { useEditorStore } from "@/store/editor.store";
import { useViewportStore } from "@/store/viewport.store";
import { useStageSize } from "./useStageSize";

const MINOR_COLOR = "rgba(148, 163, 184, 0.2)";
const MAJOR_COLOR = "rgba(148, 163, 184, 0.45)";
const MINOR_WIDTH = 0.5;
const MAJOR_WIDTH = 1;
const MAJOR_EVERY = 10;
const MIN_SCREEN_STEP = 8; // px — minimum visual spacing before subdivisions collapse

const GridRenderer = () => {
  const snapGrid = useEditorStore((s) => s.snapGrid);
  const { x: stageX, y: stageY, scale } = useViewportStore();
  const { width, height } = useStageSize();

  return (
    <Shape
      listening={false}
      sceneFunc={(ctx) => {
        // Compute visible world-space bounds
        const worldMinX = (0 - stageX) / scale;
        const worldMinY = (0 - stageY) / scale;
        const worldMaxX = (width - stageX) / scale;
        const worldMaxY = (height - stageY) / scale;

        // Scale up step until it's at least MIN_SCREEN_STEP screen pixels
        let step = snapGrid;
        while (step * scale < MIN_SCREEN_STEP) step *= 2;

        // Snap world start to grid
        const startX = Math.floor(worldMinX / step) * step;
        const startY = Math.floor(worldMinY / step) * step;

        ctx.save();

        // Vertical lines
        for (let wx = startX; wx <= worldMaxX; wx += step) {
          const isMajor = Math.abs(Math.round(wx / step)) % MAJOR_EVERY === 0;
          ctx.beginPath();
          ctx.strokeStyle = isMajor ? MAJOR_COLOR : MINOR_COLOR;
          ctx.lineWidth = (isMajor ? MAJOR_WIDTH : MINOR_WIDTH) / scale;
          ctx.moveTo(wx, worldMinY);
          ctx.lineTo(wx, worldMaxY);
          ctx.stroke();
        }

        // Horizontal lines
        for (let wy = startY; wy <= worldMaxY; wy += step) {
          const isMajor = Math.abs(Math.round(wy / step)) % MAJOR_EVERY === 0;
          ctx.beginPath();
          ctx.strokeStyle = isMajor ? MAJOR_COLOR : MINOR_COLOR;
          ctx.lineWidth = (isMajor ? MAJOR_WIDTH : MINOR_WIDTH) / scale;
          ctx.moveTo(worldMinX, wy);
          ctx.lineTo(worldMaxX, wy);
          ctx.stroke();
        }

        ctx.restore();
      }}
    />
  );
};

export default GridRenderer;
