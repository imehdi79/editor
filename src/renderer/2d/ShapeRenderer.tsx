import { Line, Text, Shape as KonvaShape, Group } from "react-konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useLayersStore } from "@/store/layers.store";
import { useEditorStore, type DimensionUnit } from "@/store/editor.store";
import { useSelectionStore } from "@/store/selection.store";
import { categoryOf } from "@/core/layers/systemCategories";
import type { Shape, WallShape, ArcWallShape, WindowShape, DoorShape } from "@/core/drawing-engine/drawing.types";
import { computeDoorSwing } from "@/core/door/computeDoorSwing";
import { buildWallLayerBands, layersOf, materialColor, WALL_SIDES } from "@/core/wall-layers/wallLayers";
import { computeWallOutlines, computeJunctionPatches, type WallOutline } from "@/core/wall-junctions";
import { arcFromChordBulge, arcPolyline } from "@/core/arc/arcGeometry";
import { formatDimension } from "@/core/dimensions/dimensionUnits";

const WALL_FILL = "#1e293b"; // slate-800 — structural body

/** Flatten a Vec2[] ring to a Konva points array. */
const flatRing = (ring: { x: number; y: number }[]): number[] => ring.flatMap((p) => [p.x, p.y]);

// ---------------------------------------------------------------------------
// Window renderer
// ---------------------------------------------------------------------------

const WindowRenderer = ({ shape }: { shape: WindowShape }) => {
  const dx = shape.x2 - shape.x1;
  const dy = shape.y2 - shape.y1;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = (-dy / len) * (shape.thickness / 2);
  const perpY = (dx / len) * (shape.thickness / 2);

  const jambPoints1 = [shape.x1 - perpX, shape.y1 - perpY, shape.x1 + perpX, shape.y1 + perpY];
  const jambPoints2 = [shape.x2 - perpX, shape.y2 - perpY, shape.x2 + perpX, shape.y2 + perpY];
  const glaze = (shape.thickness / 2) * 0.35;
  const ux = perpX / (shape.thickness / 2);
  const uy = perpY / (shape.thickness / 2);

  return (
    <Group key={shape.id}>
      <Line
        points={[shape.x1, shape.y1, shape.x2, shape.y2]}
        stroke="white"
        strokeWidth={shape.thickness}
        lineCap="butt"
      />
      <Line points={jambPoints1} stroke="#1e293b" strokeWidth={2} lineCap="butt" />
      <Line points={jambPoints2} stroke="#1e293b" strokeWidth={2} lineCap="butt" />
      <Line
        points={[shape.x1 + ux * glaze, shape.y1 + uy * glaze, shape.x2 + ux * glaze, shape.y2 + uy * glaze]}
        stroke="#60a5fa"
        strokeWidth={1.5}
        lineCap="butt"
        opacity={0.85}
      />
      <Line
        points={[shape.x1 - ux * glaze, shape.y1 - uy * glaze, shape.x2 - ux * glaze, shape.y2 - uy * glaze]}
        stroke="#60a5fa"
        strokeWidth={1.5}
        lineCap="butt"
        opacity={0.85}
      />
    </Group>
  );
};

// ---------------------------------------------------------------------------
// Door renderer — all geometry from computeDoorSwing
// ---------------------------------------------------------------------------

const DoorRenderer = ({ shape }: { shape: DoorShape }) => {
  const sw = computeDoorSwing(shape);
  const { hinge, leaf, open, arcStartRad, arcEndRad, counterClockwise, radius } = sw;

  const dx = shape.x2 - shape.x1;
  const dy = shape.y2 - shape.y1;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;
  const halfThick = shape.thickness / 2;

  const jambPoints1 = [
    shape.x1 - perpX * halfThick,
    shape.y1 - perpY * halfThick,
    shape.x1 + perpX * halfThick,
    shape.y1 + perpY * halfThick,
  ];
  const jambPoints2 = [
    shape.x2 - perpX * halfThick,
    shape.y2 - perpY * halfThick,
    shape.x2 + perpX * halfThick,
    shape.y2 + perpY * halfThick,
  ];

  return (
    <Group key={shape.id}>
      {/* Wall cut */}
      <Line
        points={[shape.x1, shape.y1, shape.x2, shape.y2]}
        stroke="white"
        strokeWidth={shape.thickness}
        lineCap="butt"
      />
      {/* Jamb lines */}
      <Line points={jambPoints1} stroke="#1e293b" strokeWidth={2} lineCap="butt" />
      <Line points={jambPoints2} stroke="#1e293b" strokeWidth={2} lineCap="butt" />
      {/* Door leaf closed */}
      <Line points={[hinge.x, hinge.y, leaf.x, leaf.y]} stroke="#92400e" strokeWidth={2} lineCap="round" />
      {/* Swing arc */}
      <KonvaShape
        sceneFunc={(ctx) => {
          ctx.beginPath();
          ctx.arc(hinge.x, hinge.y, radius, arcStartRad, arcEndRad, counterClockwise);
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
      {/* Door leaf open position */}
      <Line
        points={[hinge.x, hinge.y, open.x, open.y]}
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

/** Wall body: filled mitred polygon from the junction outline, with layer bands.
 *  Falls back to a butt-capped stroke if no outline (degenerate wall). */
const WallRenderer = ({ shape, outline }: { shape: WallShape; outline: WallOutline | undefined }) => {
  if (!outline) {
    return (
      <Line points={[shape.x1, shape.y1, shape.x2, shape.y2]} stroke={WALL_FILL} strokeWidth={shape.thickness} lineCap="butt" />
    );
  }
  const bands = buildWallLayerBands(shape, outline);
  return (
    <Group>
      {/* Construction layers as coloured build-up beside the structural core */}
      {bands.map((b, i) => (
        <Line key={i} points={b.polygon} closed fill={b.color} />
      ))}
      <Line points={flatRing(outline.polygon)} closed fill={WALL_FILL} />
    </Group>
  );
};

/** Arc (curved) wall: stroked centreline arc with thickness + concentric layer
 *  bands, and an arc-length label at the apex. */
const ArcWallRenderer = ({ shape, showLabel, unit, ppm }: { shape: ArcWallShape; showLabel: boolean; unit: DimensionUnit; ppm: number }) => {
  const base = shape.offset ?? 0;
  const bodyPts = arcPolyline(shape.x1, shape.y1, shape.x2, shape.y2, shape.bulge, 28, base);

  const bands: { pts: number[]; color: string; width: number }[] = [];
  for (const side of WALL_SIDES) {
    const sign = side === "inner" ? -1 : 1; // inner stacks toward the centre
    let off = shape.thickness / 2;
    for (const layer of layersOf(shape, side)) {
      const c = off + layer.thickness / 2;
      bands.push({
        pts: arcPolyline(shape.x1, shape.y1, shape.x2, shape.y2, shape.bulge, 28, base + sign * c),
        color: materialColor(layer.material),
        width: layer.thickness,
      });
      off += layer.thickness;
    }
  }

  const arc = arcFromChordBulge(shape.x1, shape.y1, shape.x2, shape.y2, shape.bulge);
  return (
    <Group key={shape.id}>
      {bands.map((b, i) => (
        <Line key={i} points={b.pts} stroke={b.color} strokeWidth={b.width} lineCap="butt" />
      ))}
      <Line points={bodyPts} stroke={WALL_FILL} strokeWidth={shape.thickness} lineCap="round" lineJoin="round" />
      {showLabel && arc && (
        <Text
          x={arc.apex.x + ((arc.apex.x - arc.cx) / arc.radius) * (shape.thickness / 2 + 6)}
          y={arc.apex.y + ((arc.apex.y - arc.cy) / arc.radius) * (shape.thickness / 2 + 6)}
          text={formatDimension(arc.length, unit, ppm)}
          fontSize={11}
          fill="#475569"
          listening={false}
        />
      )}
    </Group>
  );
};

const renderShape = (shape: Shape, outlines: ReturnType<typeof computeWallOutlines>, arcLabel: { show: boolean; unit: DimensionUnit; ppm: number; selectedId: string | null }) => {
  switch (shape.type) {
    case "wall":
      return <WallRenderer key={shape.id} shape={shape} outline={outlines.get(shape.id)} />;

    case "arc-wall":
      return (
        <ArcWallRenderer
          key={shape.id}
          shape={shape}
          showLabel={arcLabel.show || arcLabel.selectedId === shape.id}
          unit={arcLabel.unit}
          ppm={arcLabel.ppm}
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

// Render walls first, then openings (so white infill cuts through wall lines).
const RENDER_ORDER: Record<string, number> = { wall: 0, "arc-wall": 0, line: 1, "dashed-line": 1, text: 2, window: 3, door: 3 };

const ShapeRenderer = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const visibility = useLayersStore((s) => s.visibility);
  // Select primitives (not a derived object) so the store doesn't re-render on
  // every unrelated change; the compiler memoizes the config + outline build.
  const joinStyle = useEditorStore((s) => s.wallJoinStyle);
  const miterLimit = useEditorStore((s) => s.miterLimit);
  const endCap = useEditorStore((s) => s.wallEndCap);
  const align = useEditorStore((s) => s.junctionAlign);
  const config = { joinStyle, miterLimit, endCap, align };
  const outlines = computeWallOutlines(shapes, config);
  // Corner chamfer/fillet fills for bevel & round joins. Hidden when the
  // architectural category is hidden (patches are structural wall geometry).
  const patches = visibility.architectural ? computeJunctionPatches(shapes, config) : [];

  // Arc-length label visibility mirrors the per-segment dimension display mode.
  const dimensionUnit = useEditorStore((s) => s.dimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const dimensionDisplay = useEditorStore((s) => s.dimensionDisplay);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const arcLabel = {
    show: dimensionDisplay === "segments",
    unit: dimensionUnit,
    ppm,
    selectedId: dimensionDisplay === "selection" ? selectedId : null,
  };

  const sorted = Object.values(shapes)
    .filter((s) => visibility[categoryOf(s)]) // hide shapes in hidden categories
    .sort((a, b) => (RENDER_ORDER[a.type] ?? 1) - (RENDER_ORDER[b.type] ?? 1));

  return (
    <>
      {/* Corner patches sit below the wall bodies; same colour, so they only show
          where a chamfer/fillet leaves the bodies short. */}
      {patches.map((p, i) => (
        <Line key={`patch-${i}`} points={flatRing(p)} closed fill={WALL_FILL} />
      ))}
      {sorted.map((s) => renderShape(s, outlines, arcLabel))}
    </>
  );
};

export default ShapeRenderer;
