/**
 * GridRenderer — lightweight background grid for the 2D canvas.
 *
 * Drawn with a single Konva Shape + sceneFunc so there are zero individual
 * Konva nodes — the entire grid is one canvas draw call. This keeps it fast
 * even at large viewport sizes.
 *
 * Grid spacing: matches editor.store.snapGrid (in pixels).
 * A major gridline (slightly darker) is drawn every 10 minor cells.
 *
 * listening={false} ensures the grid never captures pointer events.
 */

import { Shape } from "react-konva";
import { useEditorStore } from "@/store/editor.store";
import { useStageSize } from "./useStageSize";

const MINOR_COLOR = "rgba(148, 163, 184, 0.2)"; // slate-400 @ 20%
const MAJOR_COLOR = "rgba(148, 163, 184, 0.45)"; // slate-400 @ 45%
const MINOR_WIDTH = 0.5;
const MAJOR_WIDTH = 1;
const MAJOR_EVERY = 10; // every N minor cells

const GridRenderer = () => {
  const snapGrid = useEditorStore((s) => s.snapGrid);
  const { width, height } = useStageSize();

  // Minimum visual grid spacing — if snapGrid is sub-pixel (e.g. 0.5px),
  // scale it up until it's at least 6px so the grid is visible.
  let step = snapGrid;
  while (step < 6) step *= 2;

  return (
    <Shape
      listening={false}
      sceneFunc={(ctx) => {
        ctx.save();

        // Vertical lines
        for (let x = 0; x <= width; x += step) {
          const isMajor = Math.round(x / step) % MAJOR_EVERY === 0;
          ctx.beginPath();
          ctx.strokeStyle = isMajor ? MAJOR_COLOR : MINOR_COLOR;
          ctx.lineWidth = isMajor ? MAJOR_WIDTH : MINOR_WIDTH;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= height; y += step) {
          const isMajor = Math.round(y / step) % MAJOR_EVERY === 0;
          ctx.beginPath();
          ctx.strokeStyle = isMajor ? MAJOR_COLOR : MINOR_COLOR;
          ctx.lineWidth = isMajor ? MAJOR_WIDTH : MINOR_WIDTH;
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        ctx.restore();
      }}
    />
  );
};

export default GridRenderer;
