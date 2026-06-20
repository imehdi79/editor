import { Line, Text, Circle, Shape as KonvaShape, Group } from "react-konva";
import type { GhostShape, WindowShape, DoorShape } from "@/core/drawing-engine/drawing.types";
import { computeDoorSwing } from "@/core/door/computeDoorSwing";
import { arcPolyline } from "@/core/arc/arcGeometry";

interface Props {
  ghost: GhostShape;
}

// ---------------------------------------------------------------------------
// Window ghost
// ---------------------------------------------------------------------------

const WindowGhost = ({ ghost }: { ghost: Omit<WindowShape, "id"> }) => {
  const dx = ghost.x2 - ghost.x1;
  const dy = ghost.y2 - ghost.y1;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = (-dy / len) * (ghost.thickness / 2);
  const perpY = (dx / len) * (ghost.thickness / 2);

  const jambPoints1 = [ghost.x1 - perpX, ghost.y1 - perpY, ghost.x1 + perpX, ghost.y1 + perpY];
  const jambPoints2 = [ghost.x2 - perpX, ghost.y2 - perpY, ghost.x2 + perpX, ghost.y2 + perpY];

  const glaze = (ghost.thickness / 2) * 0.35;
  const ux = perpX / (ghost.thickness / 2);
  const uy = perpY / (ghost.thickness / 2);
  const glazePoints1 = [ghost.x1 + ux * glaze, ghost.y1 + uy * glaze, ghost.x2 + ux * glaze, ghost.y2 + uy * glaze];
  const glazePoints2 = [ghost.x1 - ux * glaze, ghost.y1 - uy * glaze, ghost.x2 - ux * glaze, ghost.y2 - uy * glaze];

  return (
    <Group listening={false}>
      <Line
        points={[ghost.x1, ghost.y1, ghost.x2, ghost.y2]}
        stroke="white"
        strokeWidth={ghost.thickness}
        opacity={0.8}
        lineCap="butt"
        listening={false}
      />
      <Line points={jambPoints1} stroke="#3b82f6" strokeWidth={2} lineCap="butt" opacity={0.7} listening={false} />
      <Line points={jambPoints2} stroke="#3b82f6" strokeWidth={2} lineCap="butt" opacity={0.7} listening={false} />
      <Line points={glazePoints1} stroke="#60a5fa" strokeWidth={1.5} opacity={0.6} lineCap="butt" listening={false} />
      <Line points={glazePoints2} stroke="#60a5fa" strokeWidth={1.5} opacity={0.6} lineCap="butt" listening={false} />
    </Group>
  );
};

// ---------------------------------------------------------------------------
// Door ghost — all geometry from computeDoorSwing, matching DoorRenderer
// exactly so the preview is a pixel-perfect preview of the placed door.
// ---------------------------------------------------------------------------

const DoorGhost = ({ ghost }: { ghost: Omit<DoorShape, "id"> }) => {
  const sw = computeDoorSwing(ghost);
  const { hinge, leaf, open, arcStartRad, arcEndRad, counterClockwise, radius } = sw;

  const dx = ghost.x2 - ghost.x1;
  const dy = ghost.y2 - ghost.y1;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;
  const halfThick = ghost.thickness / 2;

  const jambPoints1 = [
    ghost.x1 - perpX * halfThick,
    ghost.y1 - perpY * halfThick,
    ghost.x1 + perpX * halfThick,
    ghost.y1 + perpY * halfThick,
  ];
  const jambPoints2 = [
    ghost.x2 - perpX * halfThick,
    ghost.y2 - perpY * halfThick,
    ghost.x2 + perpX * halfThick,
    ghost.y2 + perpY * halfThick,
  ];

  return (
    <Group listening={false}>
      {/* Wall cut */}
      <Line
        points={[ghost.x1, ghost.y1, ghost.x2, ghost.y2]}
        stroke="white"
        strokeWidth={ghost.thickness}
        opacity={0.8}
        lineCap="butt"
        listening={false}
      />
      {/* Jamb lines */}
      <Line points={jambPoints1} stroke="#3b82f6" strokeWidth={2} lineCap="butt" opacity={0.7} listening={false} />
      <Line points={jambPoints2} stroke="#3b82f6" strokeWidth={2} lineCap="butt" opacity={0.7} listening={false} />
      {/* Door leaf closed */}
      <Line
        points={[hinge.x, hinge.y, leaf.x, leaf.y]}
        stroke="#3b82f6"
        strokeWidth={2}
        opacity={0.6}
        lineCap="round"
        listening={false}
      />
      {/* Swing arc */}
      <KonvaShape
        sceneFunc={(ctx) => {
          ctx.beginPath();
          ctx.arc(hinge.x, hinge.y, radius, arcStartRad, arcEndRad, counterClockwise);
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.4;
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
        stroke="#3b82f6"
        strokeWidth={1}
        opacity={0.3}
        dash={[4, 3]}
        lineCap="round"
        listening={false}
      />
    </Group>
  );
};

// ---------------------------------------------------------------------------
// Root ghost renderer
// ---------------------------------------------------------------------------

const GhostRenderer = ({ ghost }: Props) => {
  if (!ghost) return null;

  switch (ghost.type) {
    case "wall":
      return (
        <Line
          points={[ghost.x1, ghost.y1, ghost.x2, ghost.y2]}
          stroke="#3b82f6"
          strokeWidth={ghost.thickness}
          opacity={0.5}
          lineCap="butt"
          listening={false}
        />
      );

    case "arc-wall":
      return (
        <Line
          points={arcPolyline(ghost.x1, ghost.y1, ghost.x2, ghost.y2, ghost.bulge)}
          stroke="#3b82f6"
          strokeWidth={ghost.thickness}
          opacity={0.5}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      );

    case "line":
      return (
        <Line
          points={[ghost.x1, ghost.y1, ghost.x2, ghost.y2]}
          stroke="#3b82f6"
          strokeWidth={2}
          dash={[6, 4]}
          listening={false}
        />
      );

    case "dashed-line":
      return (
        <Line
          points={[ghost.x1, ghost.y1, ghost.x2, ghost.y2]}
          stroke="#3b82f6"
          strokeWidth={2}
          dash={[10, 6]}
          opacity={0.6}
          listening={false}
        />
      );

    case "text":
      return (
        <>
          <Text
            x={ghost.x}
            y={ghost.y}
            text={ghost.content}
            fontSize={16}
            fill="#3b82f6"
            opacity={0.6}
            listening={false}
          />
          <Circle x={ghost.x} y={ghost.y} radius={4} fill="#3b82f6" listening={false} />
        </>
      );

    case "window":
      return <WindowGhost ghost={ghost} />;

    case "door":
      return <DoorGhost ghost={ghost} />;
  }
};

export default GhostRenderer;
