import { Line, Text, Shape as KonvaShape, Group } from "react-konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import type { Shape, WindowShape, DoorShape } from "@/core/drawing-engine/drawing.types";
import { computeDoorSwing } from "@/core/door/computeDoorSwing";

// ---------------------------------------------------------------------------
// Window renderer
// ---------------------------------------------------------------------------

const WindowRenderer = ({ shape }: { shape: WindowShape }) => {
  const dx = shape.x2 - shape.x1;
  const dy = shape.y2 - shape.y1;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = (-dy / len) * (shape.thickness / 2);
  const perpY = (dx / len) * (shape.thickness / 2);

  const jambPoints1 = [shape.x1 - perpX, shape.y1 - perpY, shape.x1 + perpX, shape.y1 + perpY];
  const jambPoints2 = [shape.x2 - perpX, shape.y2 - perpY, shape.x2 + perpX, shape.y2 + perpY];
  const glaze = (shape.thickness / 2) * 0.35;
  const ux = perpX / (shape.thickness / 2);
  const uy = perpY / (shape.thickness / 2);

  return (
    <Group key={shape.id}>
      <Line
        points={[shape.x1, shape.y1, shape.x2, shape.y2]}
        stroke="white"
        strokeWidth={shape.thickness}
        lineCap="butt"
      />
      <Line points={jambPoints1} stroke="#1e293b" strokeWidth={2} lineCap="butt" />
      <Line points={jambPoints2} stroke="#1e293b" strokeWidth={2} lineCap="butt" />
      <Line
        points={[shape.x1 + ux * glaze, shape.y1 + uy * glaze, shape.x2 + ux * glaze, shape.y2 + uy * glaze]}
        stroke="#60a5fa"
        strokeWidth={1.5}
        lineCap="butt"
        opacity={0.85}
      />
      <Line
        points={[shape.x1 - ux * glaze, shape.y1 - uy * glaze, shape.x2 - ux * glaze, shape.y2 - uy * glaze]}
        stroke="#60a5fa"
        strokeWidth={1.5}
        lineCap="butt"
        opacity={0.85}
      />
    </Group>
  );
};

// ---------------------------------------------------------------------------
// Door renderer — all geometry from computeDoorSwing
// ---------------------------------------------------------------------------

const DoorRenderer = ({ shape }: { shape: DoorShape }) => {
  const sw = computeDoorSwing(shape);
  const { hinge, leaf, open, arcStartRad, arcEndRad, counterClockwise, radius } = sw;

  const dx = shape.x2 - shape.x1;
  const dy = shape.y2 - shape.y1;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;
  const halfThick = shape.thickness / 2;

  const jambPoints1 = [
    shape.x1 - perpX * halfThick,
    shape.y1 - perpY * halfThick,
    shape.x1 + perpX * halfThick,
    shape.y1 + perpY * halfThick,
  ];
  const jambPoints2 = [
    shape.x2 - perpX * halfThick,
    shape.y2 - perpY * halfThick,
    shape.x2 + perpX * halfThick,
    shape.y2 + perpY * halfThick,
  ];

  return (
    <Group key={shape.id}>
      {/* Wall cut */}
      <Line
        points={[shape.x1, shape.y1, shape.x2, shape.y2]}
        stroke="white"
        strokeWidth={shape.thickness}
        lineCap="butt"
      />
      {/* Jamb lines */}
      <Line points={jambPoints1} stroke="#1e293b" strokeWidth={2} lineCap="butt" />
      <Line points={jambPoints2} stroke="#1e293b" strokeWidth={2} lineCap="butt" />
      {/* Door leaf closed */}
      <Line points={[hinge.x, hinge.y, leaf.x, leaf.y]} stroke="#92400e" strokeWidth={2} lineCap="round" />
      {/* Swing arc */}
      <KonvaShape
        sceneFunc={(ctx) => {
          ctx.beginPath();
          ctx.arc(hinge.x, hinge.y, radius, arcStartRad, arcEndRad, counterClockwise);
          ctx.strokeStyle = "#92400e";
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.45;
          ctx.setLineDash([5, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }}
        listening={false}
      />
      {/* Door leaf open position */}
      <Line
        points={[hinge.x, hinge.y, open.x, open.y]}
        stroke="#92400e"
        strokeWidth={1}
        opacity={0.4}
        dash={[4, 3]}
        lineCap="round"
      />
    </Group>
  );
};

// ---------------------------------------------------------------------------
// Shape dispatch
// ---------------------------------------------------------------------------

const renderShape = (shape: Shape) => {
  switch (shape.type) {
    case "wall":
      return (
        <Line
          key={shape.id}
          points={[shape.x1, shape.y1, shape.x2, shape.y2]}
          stroke="#1e293b"
          strokeWidth={shape.thickness}
          lineCap="round"
        />
      );

    case "line":
      return (
        <Line
          key={shape.id}
          points={[shape.x1, shape.y1, shape.x2, shape.y2]}
          stroke="#1e293b"
          strokeWidth={2}
          lineCap="round"
        />
      );

    case "dashed-line":
      return (
        <Line
          key={shape.id}
          points={[shape.x1, shape.y1, shape.x2, shape.y2]}
          stroke="#1e293b"
          strokeWidth={2}
          dash={[10, 6]}
          lineCap="round"
        />
      );

    case "text":
      return <Text key={shape.id} x={shape.x} y={shape.y} text={shape.content} fontSize={16} fill="#1e293b" />;

    case "window":
      return <WindowRenderer key={shape.id} shape={shape} />;

    case "door":
      return <DoorRenderer key={shape.id} shape={shape} />;
  }
};

const ShapeRenderer = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  console.log({ shapes });

  // Render walls first, then openings (so white infill cuts through wall lines)
  const sorted = Object.values(shapes).sort((a, b) => {
    const order: Record<string, number> = { wall: 0, line: 1, "dashed-line": 1, text: 2, window: 3, door: 3 };
    return (order[a.type] ?? 1) - (order[b.type] ?? 1);
  });

  return <>{sorted.map(renderShape)}</>;
};

export default ShapeRenderer;
