import { Line, Text, Shape as KonvaShape, Group } from "react-konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import type { Shape, WindowShape, DoorShape } from "@/core/drawing-engine/drawing.types";

// ---------------------------------------------------------------------------
// Window renderer — draws the opening as a white break in the wall line,
// with two thin perpendicular sill lines at each jamb, and a glazing line.
// ---------------------------------------------------------------------------

const WindowRenderer = ({ shape }: { shape: WindowShape }) => {
  const dx = shape.x2 - shape.x1;
  const dy = shape.y2 - shape.y1;
  const len = Math.hypot(dx, dy) || 1;
  // Unit perpendicular (points to the "left" of the wall direction)
  const perpX = (-dy / len) * (shape.thickness / 2);
  const perpY = (dx / len) * (shape.thickness / 2);

  // Jamb lines (vertical tick marks at each end of the opening)
  const jambPoints1 = [
    shape.x1 - perpX, shape.y1 - perpY,
    shape.x1 + perpX, shape.y1 + perpY,
  ];
  const jambPoints2 = [
    shape.x2 - perpX, shape.y2 - perpY,
    shape.x2 + perpX, shape.y2 + perpY,
  ];

  // Glazing lines: two parallel lines offset slightly from the wall centre
  const glaze = (shape.thickness / 2) * 0.35;
  const glazePoints1 = [
    shape.x1 + (perpX / (shape.thickness / 2)) * glaze,
    shape.y1 + (perpY / (shape.thickness / 2)) * glaze,
    shape.x2 + (perpX / (shape.thickness / 2)) * glaze,
    shape.y2 + (perpY / (shape.thickness / 2)) * glaze,
  ];
  const glazePoints2 = [
    shape.x1 - (perpX / (shape.thickness / 2)) * glaze,
    shape.y1 - (perpY / (shape.thickness / 2)) * glaze,
    shape.x2 - (perpX / (shape.thickness / 2)) * glaze,
    shape.y2 - (perpY / (shape.thickness / 2)) * glaze,
  ];

  return (
    <Group key={shape.id}>
      {/* White infill to visually "cut" the wall */}
      <Line
        points={[shape.x1, shape.y1, shape.x2, shape.y2]}
        stroke="white"
        strokeWidth={shape.thickness}
        lineCap="butt"
      />
      {/* Jamb lines */}
      <Line points={jambPoints1} stroke="#1e293b" strokeWidth={2} lineCap="butt" />
      <Line points={jambPoints2} stroke="#1e293b" strokeWidth={2} lineCap="butt" />
      {/* Glazing double lines */}
      <Line points={glazePoints1} stroke="#60a5fa" strokeWidth={1.5} lineCap="butt" opacity={0.85} />
      <Line points={glazePoints2} stroke="#60a5fa" strokeWidth={1.5} lineCap="butt" opacity={0.85} />
    </Group>
  );
};

// ---------------------------------------------------------------------------
// Door renderer — draws the opening with a swing arc indicating direction.
//
// The arc is a quarter-circle centred at x1, radius = door width.
// The hinge point is x1 (start of opening). The arc sweeps 90° toward
// the side determined by shape.side.
// ---------------------------------------------------------------------------

const DoorRenderer = ({ shape }: { shape: DoorShape }) => {
  const dx = shape.x2 - shape.x1;
  const dy = shape.y2 - shape.y1;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = (-dy / len);
  const perpY = (dx / len);

  // Perpendicular half-thickness vectors for jamb lines
  const halfThick = shape.thickness / 2;

  const jambPoints1 = [
    shape.x1 - perpX * halfThick, shape.y1 - perpY * halfThick,
    shape.x1 + perpX * halfThick, shape.y1 + perpY * halfThick,
  ];
  const jambPoints2 = [
    shape.x2 - perpX * halfThick, shape.y2 - perpY * halfThick,
    shape.x2 + perpX * halfThick, shape.y2 + perpY * halfThick,
  ];

  // The door leaf runs from the hinge (x1,y1) to (x2,y2) when closed
  // The swing arc: quarter circle from the closed position, rotating 90°
  // in the direction of shape.side, drawn via KonvaShape sceneFunc.
  const swingRadius = len;
  // Angle of the door (along-wall direction from hinge)
  const doorAngleRad = Math.atan2(dy, dx);
  // Swing pivots 90° toward the wall normal direction (side = ±1)
  const swingStartAngleDeg = (doorAngleRad * 180) / Math.PI;
  const swingEndAngleDeg = swingStartAngleDeg + (shape.side === 1 ? -90 : 90);

  const hx = shape.x1;
  const hy = shape.y1;

  // Endpoint of the door leaf when fully open (90° rotation from closed)
  const openAngleRad = doorAngleRad + (shape.side === 1 ? -Math.PI / 2 : Math.PI / 2);
  const openX = hx + Math.cos(openAngleRad) * swingRadius;
  const openY = hy + Math.sin(openAngleRad) * swingRadius;

  return (
    <Group key={shape.id}>
      {/* White infill to "cut" the wall */}
      <Line
        points={[shape.x1, shape.y1, shape.x2, shape.y2]}
        stroke="white"
        strokeWidth={shape.thickness}
        lineCap="butt"
      />
      {/* Jamb lines */}
      <Line points={jambPoints1} stroke="#1e293b" strokeWidth={2} lineCap="butt" />
      <Line points={jambPoints2} stroke="#1e293b" strokeWidth={2} lineCap="butt" />
      {/* Door leaf (closed position) */}
      <Line
        points={[hx, hy, shape.x2, shape.y2]}
        stroke="#92400e"
        strokeWidth={2}
        lineCap="round"
      />
      {/* Swing arc (quarter circle) */}
      <KonvaShape
        sceneFunc={(ctx, node) => {
          ctx.beginPath();
          const startRad = (swingStartAngleDeg * Math.PI) / 180;
          const endRad = (swingEndAngleDeg * Math.PI) / 180;
          // Konva arc: clockwise = false when side=1 (sweeping counter-clockwise)
          ctx.arc(hx, hy, swingRadius, startRad, endRad, shape.side === 1);
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
      {/* Door leaf (open position — thin line) */}
      <Line
        points={[hx, hy, openX, openY]}
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
  console.log({shapes})

  // Render walls first, then openings (so white infill cuts through wall lines)
  const sorted = Object.values(shapes).sort((a, b) => {
    const order: Record<string, number> = { wall: 0, line: 1, "dashed-line": 1, text: 2, window: 3, door: 3 };
    return (order[a.type] ?? 1) - (order[b.type] ?? 1);
  });

  return <>{sorted.map(renderShape)}</>;
};

export default ShapeRenderer;

