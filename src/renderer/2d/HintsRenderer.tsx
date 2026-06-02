import { Line, Circle, Text } from "react-konva";
import type { DrawingHints } from "@/core/drawing-engine/drawing.types";

interface Props {
  hints: DrawingHints;
}

const HintsRenderer = ({ hints }: Props) => {
  const { guides, snapResult, axisLocked, axisLockAngle, perpLocked } = hints;

  return (
    <>
      {/* Alignment guide lines */}
      {guides.map((g, i) => (
        <Line
          key={i}
          points={[g.x1, g.y1, g.x2, g.y2]}
          stroke="#f59e0b"
          strokeWidth={1}
          dash={[4, 4]}
          opacity={0.8}
          listening={false}
        />
      ))}

      {/* Snap indicator — دایره روی نقطه */}
      {snapResult?.snappedTo && (
        <>
          <Circle
            x={snapResult.snappedTo.x}
            y={snapResult.snappedTo.y}
            radius={snapResult.snapType === "intersection" ? 5 : 6}
            stroke={
              snapResult.snapType === "node"
                ? "#3b82f6"
                : snapResult.snapType === "midpoint"
                  ? "#10b981"
                  : snapResult.snapType === "intersection"
                    ? "#f59e0b"
                    : "#3b82f6"
            }
            strokeWidth={2}
            fill="transparent"
            listening={false}
          />
          {/* label نوع snap */}
          <Text
            x={snapResult.snappedTo.x + 10}
            y={snapResult.snappedTo.y - 16}
            text={
              snapResult.snapType === "node"
                ? "endpoint"
                : snapResult.snapType === "midpoint"
                  ? "midpoint"
                  : snapResult.snapType === "intersection"
                    ? "intersection"
                    : ""
            }
            fontSize={10}
            fill="#64748b"
            listening={false}
          />
        </>
      )}

      {/* Axis lock indicator */}
      {axisLocked && axisLockAngle && (
        <Text
          x={12}
          y={12}
          text={axisLockAngle === "horizontal" ? "— Horizontal" : "| Vertical"}
          fontSize={11}
          fill="#f59e0b"
          listening={false}
        />
      )}

      {/* Perpendicular lock indicator */}
      {perpLocked && (
        <Text x={12} y={axisLocked ? 28 : 12} text="⊾ Perpendicular" fontSize={11} fill="#a855f7" listening={false} />
      )}
    </>
  );
};

export default HintsRenderer;
