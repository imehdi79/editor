import { Text, Group } from "react-konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { computeDimensionLabel } from "@/core/dimensions/computeDimensions";
import { formatDimension } from "@/core/dimensions/dimensionUnits";
import type { Shape } from "@/core/drawing-engine/drawing.types";
import type { DimensionUnit } from "@/store/editor.store";

const MIN_LENGTH_PX = 8;

const renderShapeDimension = (shape: Shape, dimensionUnit: DimensionUnit, pixelsPerMeter: number) => {
  if (shape.type === "text") return null;


  const { x1, y1, x2, y2 } = shape;
  const lengthPx = Math.hypot(x2 - x1, y2 - y1);
  if (lengthPx < MIN_LENGTH_PX) return null;

  const label = computeDimensionLabel(x1, y1, x2, y2, formatDimension(lengthPx, dimensionUnit, pixelsPerMeter));

  const lx = label.midX + label.offsetX;
  const ly = label.midY + label.offsetY;

  return (
    <Group key={shape.id} listening={false}>
      <Text
        x={lx}
        y={ly}
        text={`${shape.id} = ${label.text}`}
        fontSize={11}
        fontFamily="monospace"
        fill="#64748b"
        offsetX={label.text.length * 3.2}
        offsetY={6}
        rotation={label.angleDeg}
        padding={3}
      />
    </Group>
  );
};

const ShapeDimensionsRenderer = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const dimensionUnit = useEditorStore((s) => s.dimensionUnit);
  const pixelsPerMeter = useEditorStore((s) => s.pixelsPerMeter);

  return <>{Object.values(shapes).map((shape) => renderShapeDimension(shape, dimensionUnit, pixelsPerMeter))}</>;
};

export default ShapeDimensionsRenderer;
