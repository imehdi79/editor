import { Line, Text } from "react-konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import type { Shape } from "@/core/drawing-engine/drawing.types";

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
  }
};

const ShapeRenderer = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  console.log({shapes})
  return <>{Object.values(shapes).map(renderShape)}</>;
};

export default ShapeRenderer;
