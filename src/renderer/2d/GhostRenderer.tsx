import { Line, Text, Circle } from "react-konva";
import type { GhostShape } from "@/core/drawing-engine/drawing.types";

interface Props {
  ghost: GhostShape;
}

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
          lineCap="round"
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
  }
};

export default GhostRenderer;
