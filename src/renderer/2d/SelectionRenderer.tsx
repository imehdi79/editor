/**
 * SelectionRenderer — selection highlight + interactive handles for move,
 * resize (endpoints), and rotate.
 *
 * Handles are rendered with listening={false} because pointer events are
 * handled by the Stage via useTransformEngine / useStageEvents — the engine
 * does its own hit-testing to avoid Konva event bubbling complications.
 */

import { Circle, Group, Line, Shape as KonvaShape } from "react-konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useSelectionStore } from "@/store/selection.store";
import type { Shape, GhostShape, WindowShape, DoorShape } from "@/core/drawing-engine/drawing.types";
import { rotationHandlePos } from "@/features/select-tool/useTransformEngine";

const SELECTION_COLOR = "#3b82f6";
const HANDLE_RADIUS = 5;
const ROTATE_HANDLE_RADIUS = 5;

// ---------------------------------------------------------------------------
// Shape overlay (shown during live drag preview)
// ---------------------------------------------------------------------------

const PreviewLine = ({ shape }: { shape: Exclude<GhostShape, null | { type: "text" }> }) => (
  <Line
    points={[shape.x1, shape.y1, shape.x2, shape.y2]}
    stroke={SELECTION_COLOR}
    strokeWidth={shape.type === "wall" ? shape.thickness : shape.type === "window" || shape.type === "door" ? shape.thickness : 2}
    opacity={0.45}
    lineCap="round"
    dash={shape.type === "dashed-line" ? [10, 6] : undefined}
    listening={false}
  />
);

// ---------------------------------------------------------------------------
// Selection handles for a segment shape
// ---------------------------------------------------------------------------

const SegmentHandles = ({ shape }: { shape: Exclude<Shape, { type: "text" }> }) => {
  const rh = rotationHandlePos(shape);
  const mx = (shape.x1 + shape.x2) / 2;
  const my = (shape.y1 + shape.y2) / 2;

  return (
    <Group listening={false}>
      {/* Dashed outline along the shape */}
      <Line
        points={[shape.x1, shape.y1, shape.x2, shape.y2]}
        stroke={SELECTION_COLOR}
        strokeWidth={1}
        dash={[4, 3]}
        opacity={0.6}
        listening={false}
      />

      {/* Endpoint handles (resize) */}
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

      {/* Midpoint / move indicator */}
      <Circle x={mx} y={my} radius={HANDLE_RADIUS - 1} fill={SELECTION_COLOR} opacity={0.75} listening={false} />

      {/* Rotation arm + handle */}
      <Line points={[mx, my, rh.x, rh.y]} stroke={SELECTION_COLOR} strokeWidth={1} opacity={0.5} listening={false} />
      <Circle
        x={rh.x}
        y={rh.y}
        radius={ROTATE_HANDLE_RADIUS}
        fill="white"
        stroke="#f59e0b"
        strokeWidth={1.5}
        listening={false}
      />

      {/* Extra side indicator for door — show which side the swing is on */}
      {shape.type === "door" && (() => {
        const dx = shape.x2 - shape.x1;
        const dy = shape.y2 - shape.y1;
        const len = Math.hypot(dx, dy) || 1;
        const sideX = mx + ((-dy / len) * shape.side * 14);
        const sideY = my + ((dx / len) * shape.side * 14);
        return (
          <Circle
            x={sideX}
            y={sideY}
            radius={3}
            fill="#92400e"
            opacity={0.7}
            listening={false}
          />
        );
      })()}
    </Group>
  );
};

const TextHandles = ({ shape }: { shape: Extract<Shape, { type: "text" }> }) => (
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

interface Props {
  previewShape: GhostShape;
}

const SelectionRenderer = ({ previewShape }: Props) => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const selectedId = useSelectionStore((s) => s.selectedId);

  if (!selectedId) return null;

  const committedShape = shapes[selectedId];
  if (!committedShape) return null;

  // During a drag: show preview overlay + handles on preview shape
  // Otherwise: show handles on the committed shape
  const displayShape = previewShape ?? committedShape;

  return (
    <>
      {/* Live drag preview */}
      {previewShape && previewShape.type !== "text" && (
        <PreviewLine shape={previewShape as Exclude<GhostShape, null | { type: "text" }>} />
      )}

      {/* Handles on the current position */}
      {displayShape.type === "text" ? (
        <TextHandles shape={displayShape as Extract<Shape, { type: "text" }>} />
      ) : (
        <SegmentHandles shape={displayShape as Exclude<Shape, { type: "text" }>} />
      )}
    </>
  );
};

export default SelectionRenderer;

