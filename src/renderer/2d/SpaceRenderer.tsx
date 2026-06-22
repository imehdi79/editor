/**
 * SpaceRenderer — fills each enclosed space (a wall-bounded floor) with a soft
 * tint and labels it with its number + net (clear) floor area at the centroid.
 *
 * Spaces are detected by computeSpaces; numbering and area match the takeoff
 * table (largest area first). The tint fills the centreline loop (full-bleed
 * under the walls) while the label reports the net floor area between finished
 * faces. Drawn under the walls and non-interactive, so it reads as floor and
 * never blocks selecting shapes.
 */

import { Group, Line, Text } from "react-konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { useViewportStore } from "@/store/viewport.store";
import { useLayersStore } from "@/store/layers.store";
import { computeSpaces } from "@/core/spaces/computeSpaces";
import { formatArea } from "@/core/dimensions/dimensionUnits";
import { dimensionPxScale } from "@/core/dimensions/dimensionLayout";
import { useTranslation } from "@/i18n";

// Cycled so adjacent spaces read as distinct; low opacity keeps them as floor tint.
const FILLS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#ef4444", "#0ea5e9"];
const FILL_OPACITY = 0.13;
const LABEL_W = 140;
const FONT = 13;

const SpaceRenderer = () => {
  const { t } = useTranslation();
  const shapes = useFloorPlanStore((s) => s.shapes);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const pxScale = useViewportStore((s) => dimensionPxScale(s.scale));
  const archVisible = useLayersStore((s) => s.visibility.architectural);

  const spaces = computeSpaces(shapes); // already sorted largest-first
  // Spaces are derived from walls (architectural) — hide them with that layer.
  if (!archVisible || spaces.length === 0) return null;

  return (
    <Group listening={false}>
      {spaces.map((space, i) => (
        <Group key={space.id}>
          <Line
            points={space.polygon.flatMap((p) => [p.x, p.y])}
            closed
            fill={FILLS[i % FILLS.length]}
            opacity={FILL_OPACITY}
          />
          {/* Label, counter-scaled on zoom-out so it stays readable. */}
          <Group x={space.centroid.x} y={space.centroid.y} scaleX={pxScale} scaleY={pxScale}>
            <Text
              x={-LABEL_W / 2}
              y={-FONT}
              width={LABEL_W}
              align="center"
              text={`${t("drawingInfo.types.space")} ${i + 1}\n${formatArea(space.netAreaPx / (ppm * ppm))}`}
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

export default SpaceRenderer;
