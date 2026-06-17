/**
 * RoomRenderer — fills each enclosed wall loop (a "room") with a soft tint and
 * labels it with its number + floor area at the centroid.
 *
 * Rooms are detected from wall centerlines by computeRoomAreas; numbering and
 * area match the takeoff table (largest area first). Drawn under the walls and
 * non-interactive, so the fill reads as floor and never blocks selecting shapes.
 */

import { Group, Line, Text } from "react-konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { useViewportStore } from "@/store/viewport.store";
import { computeRoomAreas } from "@/core/drawing-info/computeRoomAreas";
import { formatArea } from "@/core/dimensions/dimensionUnits";
import { dimensionPxScale } from "@/core/dimensions/dimensionLayout";

// Cycled so adjacent rooms read as distinct; low opacity keeps them as floor tint.
const FILLS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#ef4444", "#0ea5e9"];
const FILL_OPACITY = 0.13;
const LABEL_W = 140;
const FONT = 13;

const RoomRenderer = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const pxScale = useViewportStore((s) => dimensionPxScale(s.scale));

  const rooms = computeRoomAreas(shapes).sort((a, b) => b.areaPx - a.areaPx);
  if (rooms.length === 0) return null;

  return (
    <Group listening={false}>
      {rooms.map((room, i) => (
        <Group key={room.id}>
          <Line
            points={room.polygon.flatMap((p) => [p.x, p.y])}
            closed
            fill={FILLS[i % FILLS.length]}
            opacity={FILL_OPACITY}
          />
          {/* Label, counter-scaled on zoom-out so it stays readable. */}
          <Group x={room.centroid.x} y={room.centroid.y} scaleX={pxScale} scaleY={pxScale}>
            <Text
              x={-LABEL_W / 2}
              y={-FONT}
              width={LABEL_W}
              align="center"
              text={`Room ${i + 1}\n${formatArea(room.areaPx / (ppm * ppm))}`}
              fontSize={FONT}
              fontStyle="bold"
              fill="#1e293b"
              lineHeight={1.3}
            />
          </Group>
        </Group>
      ))}
    </Group>
  );
};

export default RoomRenderer;
