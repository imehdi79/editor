import { Line, Text, Shape as KonvaShape, Group } from "react-konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useLayersStore } from "@/store/layers.store";
import { useViewportStore } from "@/store/viewport.store";
import { useEditorStore } from "@/store/editor.store";
import { categoryOf } from "@/core/layers/systemCategories";
import type { Shape, WallShape, ArcWallShape, WindowShape, DoorShape } from "@/core/drawing-engine/drawing.types";
import { computeDoorSwing } from "@/core/door/computeDoorSwing";
import { buildWallAssemblyBands, type AssemblyBands } from "@/core/wall-layers/buildWallAssemblyBands";
import { buildArcAssemblyBands } from "@/core/wall-layers/buildArcAssemblyBands";
import { computeWallOutlines, computeJunctionPatches, finishSetbacksForWall, type WallOutline } from "@/core/wall-junctions";
import { materialHatch, HATCH_MIN_SCALE } from "./materialHatch";

const WALL_FILL = "#1e293b"; // slate-800 — structural body
const LAYER_SEPARATOR = "#475569"; // slate-600 — thin line between adjacent layers
const CORE_BOUNDARY = "#0f172a"; // slate-950 — heavier structural-core boundary

// "Existing" (retained) walls read as a lighter grey poché — distinct from the
// dark new-build body, and per-material colours/hatch are suppressed since they
// are not part of the new construction.
const EXISTING_FILL = "#cbd5e1"; // slate-300 — existing poché
const EXISTING_SEPARATOR = "#94a3b8"; // slate-400
const EXISTING_CORE = "#64748b"; // slate-500

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

/** Shared wall-body renderer: the full-width BIM composite assembly — every
 *  construction layer as a filled band, thin separators, and a heavier structural-
 *  core boundary (the professional CAD read). Identical for straight and arc walls;
 *  only the band geometry differs (mitred quads vs curved ring segments). */
const WallBody = ({ bands: a, existing, showHatch }: { bands: AssemblyBands; existing: boolean; showHatch: boolean }) => {
  const { bands, separators, coreLines } = a;
  return (
    <Group>
      {bands.map((b, i) => (
        <Line key={`b${i}`} points={b.polygon} closed fill={existing ? EXISTING_FILL : b.color || WALL_FILL} />
      ))}
      {/* Per-material CAD hatch over each band's flat fill (LOD-gated). The tile
          is a transparent canvas tiled in world space; cast for Konva's typing.
          Suppressed on existing walls — they are not new construction. */}
      {showHatch && !existing &&
        bands.map((b, i) => {
          const hatch = materialHatch(b.material);
          return hatch ? (
            <Line
              key={`h${i}`}
              points={b.polygon}
              closed
              fillPatternImage={hatch as unknown as HTMLImageElement}
              fillPatternRepeat="repeat"
              listening={false}
            />
          ) : null;
        })}
      {separators.map((s, i) => (
        <Line key={`s${i}`} points={s} stroke={existing ? EXISTING_SEPARATOR : LAYER_SEPARATOR} strokeWidth={0.75} strokeScaleEnabled={false} listening={false} />
      ))}
      {coreLines.map((c, i) => (
        <Line key={`c${i}`} points={c} stroke={existing ? EXISTING_CORE : CORE_BOUNDARY} strokeWidth={1.25} strokeScaleEnabled={false} listening={false} />
      ))}
    </Group>
  );
};

/** Straight wall body. Falls back to a butt-capped stroke if no outline
 *  (degenerate wall). */
const WallRenderer = ({
  shape,
  outline,
  setback,
  showHatch,
}: {
  shape: WallShape;
  outline: WallOutline | undefined;
  setback: { p1: number; p2: number } | undefined;
  showHatch: boolean;
}) => {
  if (!outline) {
    return (
      <Line points={[shape.x1, shape.y1, shape.x2, shape.y2]} stroke={WALL_FILL} strokeWidth={shape.thickness} lineCap="butt" />
    );
  }
  return <WallBody bands={buildWallAssemblyBands(shape, outline, setback)} existing={shape.existing === true} showHatch={showHatch} />;
};

/** Arc (curved) wall body: the same composite assembly, drawn as junction-resolved
 *  curved ring-segment bands so corners mitre/butt into neighbours exactly like a
 *  straight wall. Dimensions are drawn by ArcDimensionRenderer, not here. Falls
 *  back to a butt-capped stroke along the chord if no outline (degenerate). */
const ArcWallRenderer = ({
  shape,
  outline,
  setback,
  showHatch,
}: {
  shape: ArcWallShape;
  outline: WallOutline | undefined;
  setback: { p1: number; p2: number } | undefined;
  showHatch: boolean;
}) => {
  if (!outline) {
    return (
      <Line points={[shape.x1, shape.y1, shape.x2, shape.y2]} stroke={WALL_FILL} strokeWidth={shape.thickness} lineCap="butt" />
    );
  }
  return <WallBody bands={buildArcAssemblyBands(shape, outline, setback)} existing={shape.existing === true} showHatch={showHatch} />;
};

const renderShape = (
  shape: Shape,
  outlines: ReturnType<typeof computeWallOutlines>,
  setbacks: Record<string, { p1: number; p2: number }>,
  showHatch: boolean,
) => {
  switch (shape.type) {
    case "wall":
      return (
        <WallRenderer
          key={shape.id}
          shape={shape}
          outline={outlines.get(shape.id)}
          setback={setbacks[shape.id]}
          showHatch={showHatch}
        />
      );

    case "arc-wall":
      return (
        <ArcWallRenderer
          key={shape.id}
          shape={shape}
          outline={outlines.get(shape.id)}
          setback={setbacks[shape.id]}
          showHatch={showHatch}
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
  // LOD: material hatches are skipped when zoomed out (sub-pixel noise + cost).
  const showHatch = useViewportStore((s) => s.scale >= HATCH_MIN_SCALE);
  // Select primitives (not a derived object) so the store doesn't re-render on
  // every unrelated change; the compiler memoizes the config + outline build.
  const joinStyle = useEditorStore((s) => s.wallJoinStyle);
  const miterLimit = useEditorStore((s) => s.miterLimit);
  const endCap = useEditorStore((s) => s.wallEndCap);
  const align = useEditorStore((s) => s.junctionAlign);
  const config = { joinStyle, miterLimit, endCap, align };
  const outlines = computeWallOutlines(shapes, config);
  // Per-layer junction cleanup: how far each wall's finish bands pull back from
  // the structural cut so they die into the abutting host's finished face (0 for
  // plain walls / non-butt joins — those render exactly as the structural body).
  const setbacks: Record<string, { p1: number; p2: number }> = {};
  for (const s of Object.values(shapes)) {
    if (s.type === "wall" || s.type === "arc-wall") setbacks[s.id] = finishSetbacksForWall(s, shapes, config);
  }
  // Corner chamfer/fillet fills for bevel & round joins. Hidden when the
  // architectural category is hidden (patches are structural wall geometry).
  const patches = visibility.architectural ? computeJunctionPatches(shapes, config) : [];

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
      {sorted.map((s) => renderShape(s, outlines, setbacks, showHatch))}
    </>
  );
};

export default ShapeRenderer;
