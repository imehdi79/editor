/**
 * SpaceRenderer — fills each enclosed space (a wall-bounded floor) with a soft
 * tint and labels it with its number + net (clear) floor area at the centroid.
 *
 * Spaces are detected by computeSpaces; numbering and area match the takeoff
 * table (largest area first). The tint fills the centreline loop (full-bleed
 * under the walls) with any courtyard / atrium holes punched out, while the label
 * reports the net floor area between finished faces. Drawn under the walls.
 *
 * In select / pan mode the fills are interactive: clicking one selects the space
 * (to edit its floor + ceiling assemblies in the inspector) and the selected
 * space reads with a stronger tint + outline. While a drawing tool is active the
 * fills stop listening, so they never intercept drawing — and an empty-space drag
 * still pans (a space is selected on a click, not a drag).
 */

import { Group, Shape as KonvaShape, Text } from "react-konva";
import type Konva from "konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { useViewportStore } from "@/store/viewport.store";
import { useLayersStore } from "@/store/layers.store";
import { useToolsStore } from "@/store/tools.store";
import { useSelectionStore } from "@/store/selection.store";
import { computeSpaces, type Space } from "@/core/spaces/computeSpaces";
import { formatArea } from "@/core/dimensions/dimensionUnits";
import { dimensionPxScale } from "@/core/dimensions/dimensionLayout";
import { useTranslation } from "@/i18n";

// Cycled so adjacent spaces read as distinct; low opacity keeps them as floor tint.
const FILLS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#ef4444", "#0ea5e9"];
const FILL_OPACITY = 0.13;
const SELECTED_OPACITY = 0.28;
const SELECTED_STROKE = "#2563eb"; // blue-600 — selected room outline
const LABEL_W = 140;
const FONT = 13;

/** Trace an outer ring + its holes into the context; opposite-wound holes punch
 *  out under the default (nonzero) fill rule, so a courtyard reads as open. */
const traceSpace = (ctx: Konva.Context, space: Space) => {
  const ring = (r: { x: number; y: number }[]) => {
    if (r.length === 0) return;
    ctx.moveTo(r[0].x, r[0].y);
    for (let i = 1; i < r.length; i++) ctx.lineTo(r[i].x, r[i].y);
    ctx.closePath();
  };
  ctx.beginPath();
  ring(space.polygon);
  for (const h of space.holes) ring(h);
};

const SpaceRenderer = () => {
  const { t } = useTranslation();
  const shapes = useFloorPlanStore((s) => s.shapes);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const pxScale = useViewportStore((s) => dimensionPxScale(s.scale));
  const archVisible = useLayersStore((s) => s.visibility.architectural);
  const tool = useToolsStore((s) => s.tool);
  const selectedSpaceId = useSelectionStore((s) => s.selectedSpaceId);
  const selectSpace = useSelectionStore((s) => s.selectSpace);

  const spaces = computeSpaces(shapes); // already sorted largest-first
  // Spaces are derived from walls (architectural) — hide them with that layer.
  if (!archVisible || spaces.length === 0) return null;

  // Interactive only in select / pan mode, so drawing tools are never intercepted.
  const interactive = tool === "select" || tool === null;

  return (
    <Group listening={interactive}>
      {spaces.map((space, i) => {
        const selected = space.id === selectedSpaceId;
        const color = FILLS[i % FILLS.length];
        return (
          <Group key={space.id}>
            <KonvaShape
              sceneFunc={(ctx, shape) => {
                traceSpace(ctx, space);
                ctx.fillStrokeShape(shape);
              }}
              fill={color}
              opacity={selected ? SELECTED_OPACITY : FILL_OPACITY}
              stroke={selected ? SELECTED_STROKE : undefined}
              strokeWidth={selected ? 1.5 : 0}
              strokeScaleEnabled={false}
              onClick={() => selectSpace(space.id)}
              onTap={() => selectSpace(space.id)}
            />
            {/* Label, counter-scaled on zoom-out so it stays readable. */}
            <Group x={space.centroid.x} y={space.centroid.y} scaleX={pxScale} scaleY={pxScale} listening={false}>
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
        );
      })}
    </Group>
  );
};

export default SpaceRenderer;
