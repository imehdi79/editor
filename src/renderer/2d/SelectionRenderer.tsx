/**
 * SelectionRenderer — draws a visual highlight around the selected shape.
 *
 * Currently renders a bounding rect (for segment shapes) or a circle
 * (for text anchors). Designed to be the mounting point for future
 * resize handles, rotation handles, and move indicators.
 */

import { Rect, Circle, Group } from "react-konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useSelectionStore } from "@/store/selection.store";
import type { Shape } from "@/core/drawing-engine/drawing.types";

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

const PADDING = 6;
const HANDLE_RADIUS = 5;
const SELECTION_COLOR = "#3b82f6";

interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const segmentBBox = (shape: Exclude<Shape, { type: "text" }>): BBox => {
  const minX = Math.min(shape.x1, shape.x2) - PADDING;
  const minY = Math.min(shape.y1, shape.y2) - PADDING;
  const maxX = Math.max(shape.x1, shape.x2) + PADDING;
  const maxY = Math.max(shape.y1, shape.y2) + PADDING;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

// ---------------------------------------------------------------------------
// Per-shape renderers
// ---------------------------------------------------------------------------

const SegmentSelection = ({ shape }: { shape: Exclude<Shape, { type: "text" }> }) => {
  const bbox = segmentBBox(shape);

  return (
    <Group listening={false}>
      {/* Selection bounding box */}
      <Rect
        x={bbox.x}
        y={bbox.y}
        width={bbox.width}
        height={bbox.height}
        stroke={SELECTION_COLOR}
        strokeWidth={1}
        dash={[4, 3]}
        fill={`${SELECTION_COLOR}10`}
        cornerRadius={2}
        listening={false}
      />
      {/* Endpoint handles — will become resize handles */}
      <Circle
        x={shape.x1}
        y={shape.y1}
        radius={HANDLE_RADIUS}
        fill="white"
        stroke={SELECTION_COLOR}
        strokeWidth={1.5}
        listening={false}
      />
      <Circle
        x={shape.x2}
        y={shape.y2}
        radius={HANDLE_RADIUS}
        fill="white"
        stroke={SELECTION_COLOR}
        strokeWidth={1.5}
        listening={false}
      />
      {/* Midpoint handle — will become move handle */}
      <Circle
        x={(shape.x1 + shape.x2) / 2}
        y={(shape.y1 + shape.y2) / 2}
        radius={HANDLE_RADIUS - 1}
        fill={SELECTION_COLOR}
        opacity={0.7}
        listening={false}
      />
    </Group>
  );
};

const TextSelection = ({ shape }: { shape: Extract<Shape, { type: "text" }> }) => (
  <Group listening={false}>
    <Circle
      x={shape.x}
      y={shape.y}
      radius={HANDLE_RADIUS + 2}
      stroke={SELECTION_COLOR}
      strokeWidth={1.5}
      fill={`${SELECTION_COLOR}20`}
      listening={false}
    />
  </Group>
);

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

const SelectionRenderer = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const selectedId = useSelectionStore((s) => s.selectedId);

  if (!selectedId) return null;

  const shape = shapes[selectedId];
  if (!shape) return null;

  if (shape.type === "text") return <TextSelection shape={shape} />;
  return <SegmentSelection shape={shape} />;
};

export default SelectionRenderer;
