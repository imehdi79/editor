import { Line, Text, Group } from "react-konva";
import type { DrawingHints } from "@/core/drawing-engine/drawing.types";

interface Props {
  hints: DrawingHints;
}

const TICK_SIZE = 5;

const DimensionRenderer = ({ hints }: Props) => {
  const { dimension, perpLocked } = hints;
  if (!dimension || dimension.lengthPx < 8) return null;

  const lx = dimension.midX + dimension.offsetX;
  const ly = dimension.midY + dimension.offsetY;

  return (
    <Group listening={false}>
      {/* tick کوچک ابتدا و انتها */}
      <Line
        points={[
          dimension.midX - Math.cos(((dimension.angleDeg + 90) * Math.PI) / 180) * TICK_SIZE,
          dimension.midY - Math.sin(((dimension.angleDeg + 90) * Math.PI) / 180) * TICK_SIZE,
          dimension.midX + Math.cos(((dimension.angleDeg + 90) * Math.PI) / 180) * TICK_SIZE,
          dimension.midY + Math.sin(((dimension.angleDeg + 90) * Math.PI) / 180) * TICK_SIZE,
        ]}
        stroke={perpLocked ? "#a855f7" : "#3b82f6"}
        strokeWidth={1}
        opacity={0.7}
      />

      {/* label پس‌زمینه */}
      <Text
        x={lx}
        y={ly}
        text={dimension.text}
        fontSize={11}
        fontFamily="monospace"
        fill={perpLocked ? "#a855f7" : "#1e293b"}
        offsetX={dimension.text.length * 3.2}
        offsetY={6}
        rotation={dimension.angleDeg}
        padding={3}
      />
    </Group>
  );
};

export default DimensionRenderer;
