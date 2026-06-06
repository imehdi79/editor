import { Text, Group } from "react-konva";
import type { DrawingHints } from "@/core/drawing-engine/drawing.types";

interface Props {
  hints: DrawingHints;
}

const DimensionRenderer = ({ hints }: Props) => {
  const { dimension, perpLocked } = hints;
  if (!dimension || dimension.lengthPx < 8) return null;

  const lx = dimension.midX + dimension.offsetX;
  const ly = dimension.midY + dimension.offsetY;

  return (
    <Group listening={false}>
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
