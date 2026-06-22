/**
 * ArcDimensionRenderer — on-canvas dimensions for arc walls.
 *
 * Arc walls are excluded from the linear per-segment dimension system (their
 * "length" is curved), so they carry their own three canonical arch dimensions,
 * each placed clear of the curved body:
 *
 *   • Chord  — a linear dimension between the endpoints, on the side OPPOSITE the
 *     bulge (the straight side, where there is no curve to collide with);
 *   • Depth  — the rise / sagitta, dimensioned along the chord→apex line inside
 *     the cap;
 *   • Arc length — labelled just outside the apex on the convex side, prefixed
 *     with an arc glyph.
 *
 * Geometry reuses computeSegmentDimension; the visual mirrors the running-chain
 * annotations. Shown in the "segments"/"both" dimension-display modes.
 */

import { Group, Line, Text, Rect } from "react-konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore, type DimensionUnit } from "@/store/editor.store";
import { useViewportStore } from "@/store/viewport.store";
import { useLayersStore } from "@/store/layers.store";
import type { ArcWallShape } from "@/core/drawing-engine/drawing.types";
import { arcFromChordBulge } from "@/core/arc/arcGeometry";
import { formatDimension } from "@/core/dimensions/dimensionUnits";
import {
  computeSegmentDimension,
  DIM_OFFSET,
  TICK_HALF,
  type DimensionGeometry,
} from "@/core/dimensions/dimensionGeometry";
import {
  metricsFromGeometry,
  measureLabel,
  LABEL_FONT_FAMILY,
  dimensionPxScale,
  isDimensionLegible,
  type LabelMetrics,
} from "@/core/dimensions/dimensionLayout";

const DIM_COLOR = "#475569"; // slate-600
const LABEL_BG = "#f1f5f9"; // slate-100
const LABEL_FG = "#0f172a"; // slate-900
const DIM_LINE_WIDTH = 0.75;
const TICK_WIDTH = 1;
const LABEL_BG_RADIUS = 2;

// ---------------------------------------------------------------------------
// Shared annotation pieces (mirrors the chain renderer)
// ---------------------------------------------------------------------------

const Tick = ({ x, y, angleDeg, pxScale }: { x: number; y: number; angleDeg: number; pxScale: number }) => {
  const rad = ((angleDeg + 90) * Math.PI) / 180;
  const tx = Math.cos(rad) * TICK_HALF * pxScale;
  const ty = Math.sin(rad) * TICK_HALF * pxScale;
  return <Line points={[x - tx, y - ty, x + tx, y + ty]} stroke={DIM_COLOR} strokeWidth={TICK_WIDTH * pxScale} listening={false} />;
};

const LabelBox = ({
  metrics,
  text,
  angleDeg,
  anchor,
}: {
  metrics: LabelMetrics;
  text: string;
  angleDeg: number;
  anchor: { x: number; y: number };
}) => {
  const { boxWidth, boxHeight, offsetX, offsetY, fontSize, padding } = metrics;
  return (
    <Group x={anchor.x} y={anchor.y} offsetX={offsetX} offsetY={offsetY} rotation={angleDeg} listening={false}>
      <Rect x={0} y={0} width={boxWidth} height={boxHeight} fill={LABEL_BG} cornerRadius={LABEL_BG_RADIUS} />
      <Text x={padding} y={padding} text={text} fontSize={fontSize} fontFamily={LABEL_FONT_FAMILY} fill={LABEL_FG} />
    </Group>
  );
};

/** A full dimension annotation: optional extension lines, a gapped dim line with
 *  ticks, and the centred label. */
const Annotation = ({
  geom,
  metrics,
  text,
  pxScale,
  showExt = true,
}: {
  geom: DimensionGeometry;
  metrics: LabelMetrics;
  text: string;
  pxScale: number;
  showExt?: boolean;
}) => {
  const { extLine1, extLine2, dimLine, labelAnchor, angleDeg } = geom;
  const lineLen = Math.hypot(dimLine.x2 - dimLine.x1, dimLine.y2 - dimLine.y1) || 1;
  const dx = (dimLine.x2 - dimLine.x1) / lineLen;
  const dy = (dimLine.y2 - dimLine.y1) / lineLen;
  const halfGap = metrics.boxWidth / 2 + 3 * pxScale;
  return (
    <Group listening={false}>
      {showExt && (
        <>
          <Line points={[extLine1.x1, extLine1.y1, extLine1.x2, extLine1.y2]} stroke={DIM_COLOR} strokeWidth={DIM_LINE_WIDTH * pxScale} opacity={0.8} />
          <Line points={[extLine2.x1, extLine2.y1, extLine2.x2, extLine2.y2]} stroke={DIM_COLOR} strokeWidth={DIM_LINE_WIDTH * pxScale} opacity={0.8} />
        </>
      )}
      <Line points={[dimLine.x1, dimLine.y1, labelAnchor.x - dx * halfGap, labelAnchor.y - dy * halfGap]} stroke={DIM_COLOR} strokeWidth={DIM_LINE_WIDTH * pxScale} />
      <Line points={[labelAnchor.x + dx * halfGap, labelAnchor.y + dy * halfGap, dimLine.x2, dimLine.y2]} stroke={DIM_COLOR} strokeWidth={DIM_LINE_WIDTH * pxScale} />
      <Tick x={dimLine.x1} y={dimLine.y1} angleDeg={angleDeg} pxScale={pxScale} />
      <Tick x={dimLine.x2} y={dimLine.y2} angleDeg={angleDeg} pxScale={pxScale} />
      <LabelBox metrics={metrics} text={text} angleDeg={angleDeg} anchor={labelAnchor} />
    </Group>
  );
};

// ---------------------------------------------------------------------------
// Per-arc dimensions
// ---------------------------------------------------------------------------

const ArcDims = ({ shape, unit, ppm, pxScale, zoom }: { shape: ArcWallShape; unit: DimensionUnit; ppm: number; pxScale: number; zoom: number }) => {
  const { x1, y1, x2, y2, bulge } = shape;
  const offset = DIM_OFFSET * pxScale;

  // Chord — opposite the bulge so the dimension never crosses the arc.
  const chordLen = Math.hypot(x2 - x1, y2 - y1);
  const chordText = formatDimension(chordLen, unit, ppm);
  const chordSide: 1 | -1 = bulge >= 0 ? -1 : 1;
  const chordGeom = computeSegmentDimension(x1, y1, x2, y2, chordSide, offset, pxScale);
  const chordMetrics = metricsFromGeometry(chordGeom, chordText, pxScale);
  // Level-of-detail cull: each arc dimension hides when too small on screen to
  // read at this zoom, and reappears on zoom-in (matches the linear dim system).
  const showChord = isDimensionLegible(chordLen, zoom);

  const arc = arcFromChordBulge(x1, y1, x2, y2, bulge);
  if (!arc) return showChord ? <Annotation geom={chordGeom} metrics={chordMetrics} text={chordText} pxScale={pxScale} /> : null;

  // Depth (rise / sagitta) — along the chord-midpoint → apex line, inside the cap.
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const depthText = formatDimension(Math.abs(bulge), unit, ppm);
  const depthGeom = computeSegmentDimension(mx, my, arc.apex.x, arc.apex.y, 1, 0, pxScale);
  const depthMetrics = metricsFromGeometry(depthGeom, depthText, pxScale);
  const showDepth = isDimensionLegible(Math.abs(bulge), zoom);

  // Arc length — just outside the apex on the convex side.
  const ox = (arc.apex.x - arc.cx) / arc.radius;
  const oy = (arc.apex.y - arc.cy) / arc.radius;
  const gap = shape.thickness / 2 + 16 * pxScale;
  const arcAnchor = { x: arc.apex.x + ox * gap, y: arc.apex.y + oy * gap };
  const arcText = `⌒ ${formatDimension(arc.length, unit, ppm)}`;
  const arcMetrics = measureLabel(arcText, arcAnchor, 0, pxScale);
  const showArc = isDimensionLegible(arc.length, zoom);

  if (!showChord && !showDepth && !showArc) return null;

  return (
    <Group listening={false}>
      {showChord && <Annotation geom={chordGeom} metrics={chordMetrics} text={chordText} pxScale={pxScale} />}
      {showDepth && <Annotation geom={depthGeom} metrics={depthMetrics} text={depthText} pxScale={pxScale} showExt={false} />}
      {showArc && <LabelBox metrics={arcMetrics} text={arcText} angleDeg={0} anchor={arcAnchor} />}
    </Group>
  );
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

const ArcDimensionRenderer = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const unit = useEditorStore((s) => s.dimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const mode = useEditorStore((s) => s.dimensionDisplay);
  const archVisible = useLayersStore((s) => s.visibility.architectural);
  const zoom = useViewportStore((s) => s.scale);
  const pxScale = dimensionPxScale(zoom);

  if (!archVisible || (mode !== "segments" && mode !== "both")) return null;

  const arcs = Object.values(shapes).filter((s) => s.type === "arc-wall");
  if (arcs.length === 0) return null;

  return (
    <Group listening={false}>
      {arcs.map((s) => (
        <ArcDims key={s.id} shape={s} unit={unit} ppm={ppm} pxScale={pxScale} zoom={zoom} />
      ))}
    </Group>
  );
};

export default ArcDimensionRenderer;
