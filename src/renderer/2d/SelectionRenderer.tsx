/**
 * SelectionRenderer — selection highlight + interactive handles.
 *
 * --- The shared-node problem (solved here) ---
 *
 * When two walls share an endpoint (e.g. wall-A.p2 and wall-B.p1 both sit
 * at (100, 0)), the naive approach renders two overlapping handle circles.
 * The top circle belongs to whichever shape was drawn last (higher z-order
 * in the Konva layer). When the user clicks it they grab the WRONG shape,
 * and the handle they see is mismatched with the shape that gets selected.
 *
 * Fix: compute the topology of all shapes, find every unique node position,
 * and render EXACTLY ONE handle circle per unique position. The circle is
 * always on top (rendered in SelectionRenderer above all shapes) and always
 * refers unambiguously to the canonical node — not to any individual shape.
 *
 * During a shared-node drag, useTransformEngine fans out the coordinate
 * update to all endpoints in the node, so all connected walls move together.
 * The `connectedPreviews` map from the engine lets us preview those shapes
 * while the drag is in progress.
 */

import { Circle, Group, Line } from "react-konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useSelectionStore } from "@/store/selection.store";
import type { Shape, GhostShape, WindowShape, DoorShape } from "@/core/drawing-engine/drawing.types";
import { rotationHandlePos, ROTATE_HANDLE_OFFSET } from "@/features/select-tool/useTransformEngine";
import { computeTopology, nodeKey } from "@/core/topology/computeTopology";

const SELECTION_COLOR = "#3b82f6";
const HANDLE_RADIUS = 5;
const ROTATE_HANDLE_RADIUS = 5;

// ---------------------------------------------------------------------------
// Preview overlay (shown while dragging)
// ---------------------------------------------------------------------------

const PreviewLine = ({ shape }: { shape: Exclude<GhostShape, null | { type: "text" }> }) => (
  <Line
    points={[shape.x1, shape.y1, shape.x2, shape.y2]}
    stroke={SELECTION_COLOR}
    strokeWidth={shape.type === "wall" || shape.type === "window" || shape.type === "door" ? shape.thickness : 2}
    opacity={0.45}
    lineCap="round"
    dash={shape.type === "dashed-line" ? [10, 6] : undefined}
    listening={false}
  />
);

// ---------------------------------------------------------------------------
// Handles for the selected shape — body outline + rotation handle only.
// Endpoint handle circles are rendered separately by NodeHandles below.
// ---------------------------------------------------------------------------

const SegmentHandles = ({ shape }: { shape: Exclude<Shape, { type: "text" }> }) => {
  const rh = rotationHandlePos(shape);
  const mx = (shape.x1 + shape.x2) / 2;
  const my = (shape.y1 + shape.y2) / 2;

  return (
    <Group listening={false}>
      {/* Dashed outline */}
      <Line
        points={[shape.x1, shape.y1, shape.x2, shape.y2]}
        stroke={SELECTION_COLOR}
        strokeWidth={1}
        dash={[4, 3]}
        opacity={0.6}
        listening={false}
      />
      {/* Midpoint move indicator */}
      <Circle x={mx} y={my} radius={HANDLE_RADIUS - 1} fill={SELECTION_COLOR} opacity={0.75} listening={false} />
      {/* Rotation arm */}
      <Line points={[mx, my, rh.x, rh.y]} stroke={SELECTION_COLOR} strokeWidth={1} opacity={0.5} listening={false} />
      {/* Rotation/flip handle — amber for walls/lines, blue for door swing toggle */}
      <Circle
        x={rh.x}
        y={rh.y}
        radius={ROTATE_HANDLE_RADIUS}
        fill="white"
        stroke={shape.type === "door" || shape.type === "window" ? "#3b82f6" : "#f59e0b"}
        strokeWidth={1.5}
        listening={false}
      />
      {/* Door: second handle at midpoint for hingeSide toggle */}
      {shape.type === "door" &&
        (() => {
          const mx = (shape.x1 + shape.x2) / 2;
          const my = (shape.y1 + shape.y2) / 2;
          const dx = shape.x2 - shape.x1;
          const dy = shape.y2 - shape.y1;
          const len = Math.hypot(dx, dy) || 1;
          // Place hinge toggle handle on the opposite side of the body handle
          const hingeHandleX = mx - (-dy / len) * ROTATE_HANDLE_OFFSET;
          const hingeHandleY = my - (dx / len) * ROTATE_HANDLE_OFFSET;
          return (
            <Circle
              key="hinge-handle"
              x={hingeHandleX}
              y={hingeHandleY}
              radius={ROTATE_HANDLE_RADIUS}
              fill="white"
              stroke="#10b981"
              strokeWidth={1.5}
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
// Node handles — ONE circle per unique endpoint position across ALL shapes.
//
// This is the core fix: instead of rendering two overlapping circles at a
// shared node (one per connected shape), we render exactly one. The topology
// map guarantees uniqueness — shared nodes have refs.length > 1 but still
// appear once in the map.
//
// We render handles for all nodes of the SELECTED shape. For shared nodes
// we use a slightly different fill so the user can see a connection exists.
// ---------------------------------------------------------------------------

const NodeHandles = ({
  selectedShape,
  shapes,
}: {
  selectedShape: Exclude<Shape, { type: "text" }>;
  shapes: Record<string, Shape>;
}) => {
  const topology = computeTopology(shapes);

  // Collect the two node positions of the selected shape
  const nodePositions = [
    { x: selectedShape.x1, y: selectedShape.y1 },
    { x: selectedShape.x2, y: selectedShape.y2 },
  ];

  return (
    <Group listening={false}>
      {nodePositions.map(({ x, y }) => {
        const key = nodeKey(x, y);
        const topoNode = topology.get(key);
        const isShared = topoNode ? topoNode.refs.length > 1 : false;

        return (
          <Circle
            key={key}
            x={x}
            y={y}
            radius={HANDLE_RADIUS}
            fill={isShared ? SELECTION_COLOR : "white"}
            stroke={SELECTION_COLOR}
            strokeWidth={1.5}
            opacity={isShared ? 0.9 : 1}
            listening={false}
          />
        );
      })}
    </Group>
  );
};

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

interface Props {
  previewShape: GhostShape;
  /** Co-dragged connected shapes, keyed by shapeId, value is coord patch */
  connectedPreviews: Record<string, { x1?: number; y1?: number; x2?: number; y2?: number }>;
}

const SelectionRenderer = ({ previewShape, connectedPreviews }: Props) => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const selectedId = useSelectionStore((s) => s.selectedId);

  if (!selectedId) return null;
  const committedShape = shapes[selectedId];
  if (!committedShape) return null;

  const displayShape = previewShape ?? committedShape;

  // Build preview shapes for connected co-dragged walls
  const connectedDisplayShapes = Object.entries(connectedPreviews)
    .map(([id, patch]) => {
      const base = shapes[id];
      if (!base || base.type === "text") return null;
      return { ...base, ...patch } as Exclude<Shape, { type: "text" }>;
    })
    .filter(Boolean) as Exclude<Shape, { type: "text" }>[];

  return (
    <>
      {/* Preview overlay for the primary selected shape */}
      {previewShape && previewShape.type !== "text" && (
        <PreviewLine shape={previewShape as Exclude<GhostShape, null | { type: "text" }>} />
      )}

      {/* Preview overlays for co-dragged connected shapes */}
      {connectedDisplayShapes.map((s) => (
        <PreviewLine key={s.id} shape={s as Exclude<GhostShape, null | { type: "text" }>} />
      ))}

      {/* Selection handles on the current display shape */}
      {displayShape.type === "text" ? (
        <TextHandles shape={displayShape as Extract<Shape, { type: "text" }>} />
      ) : (
        <>
          <SegmentHandles shape={displayShape as Exclude<Shape, { type: "text" }>} />
          {/* One endpoint handle circle per unique node position */}
          <NodeHandles selectedShape={displayShape as Exclude<Shape, { type: "text" }>} shapes={shapes} />
        </>
      )}
    </>
  );
};

export default SelectionRenderer;
