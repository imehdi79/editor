/**
 * DimensionChainsRenderer — draws inner (زنجیره داخلی) and outer (زنجیره بیرونی)
 * running dimension chains for collinear wall runs with perpendicular junctions.
 *
 * Visual language:
 *   Inner chain — blue tint (slate-400), stacked above per-segment dims
 *   Outer chain — indigo tint (indigo-400), stacked even further out
 *
 * Only shown for runs that have T-junctions (≥3 break-points). Single isolated
 * walls are already covered by the regular per-segment DimensionLayerRenderer.
 */

import { Group, Line, Text, Rect } from "react-konva";
import { useDimensionChains } from "@/core/dimensions/useDimensionChains";
import { useViewportStore } from "@/store/viewport.store";
import { useEditorStore } from "@/store/editor.store";
import type { ChainSegment } from "@/core/dimensions/dimensionChains";
import { TICK_HALF } from "@/core/dimensions/dimensionGeometry";
import { LABEL_FONT_FAMILY, dimensionPxScale } from "@/core/dimensions/dimensionLayout";

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const INNER_DIM_COLOR  = "#60a5fa"; // blue-400
const INNER_EXT_COLOR  = "#93c5fd"; // blue-300
const INNER_LABEL_BG   = "#eff6ff"; // blue-50
const INNER_LABEL_FG   = "#1e40af"; // blue-800

const OUTER_DIM_COLOR  = "#818cf8"; // indigo-400
const OUTER_EXT_COLOR  = "#a5b4fc"; // indigo-300
const OUTER_LABEL_BG   = "#eef2ff"; // indigo-50
const OUTER_LABEL_FG   = "#3730a3"; // indigo-800

const DIM_LINE_WIDTH = 0.75;
const EXT_LINE_WIDTH = 0.75;
const TICK_WIDTH     = 1;
const LABEL_BG_RADIUS = 2;

// ---------------------------------------------------------------------------
// Per-chain-kind colors
// ---------------------------------------------------------------------------

const colors = (kind: "inner" | "outer") =>
  kind === "inner"
    ? { dim: INNER_DIM_COLOR, ext: INNER_EXT_COLOR, labelBg: INNER_LABEL_BG, labelFg: INNER_LABEL_FG }
    : { dim: OUTER_DIM_COLOR, ext: OUTER_EXT_COLOR, labelBg: OUTER_LABEL_BG, labelFg: OUTER_LABEL_FG };

// ---------------------------------------------------------------------------
// Sub-renderers (mirrors DimensionLayerRenderer but uses chain colors)
// ---------------------------------------------------------------------------

const ChainExtLines = ({ seg, pxScale }: { seg: ChainSegment; pxScale: number }) => {
  const c = colors(seg.kind);
  const { extLine1, extLine2 } = seg.geom;
  return (
    <>
      <Line points={[extLine1.x1, extLine1.y1, extLine1.x2, extLine1.y2]}
        stroke={c.ext} strokeWidth={EXT_LINE_WIDTH * pxScale} opacity={0.8} listening={false} />
      <Line points={[extLine2.x1, extLine2.y1, extLine2.x2, extLine2.y2]}
        stroke={c.ext} strokeWidth={EXT_LINE_WIDTH * pxScale} opacity={0.8} listening={false} />
    </>
  );
};

const ChainTickMark = ({ x, y, angleDeg, kind, pxScale }: { x: number; y: number; angleDeg: number; kind: "inner" | "outer"; pxScale: number }) => {
  const tickRad = ((angleDeg + 90) * Math.PI) / 180;
  const tx = Math.cos(tickRad) * TICK_HALF * pxScale;
  const ty = Math.sin(tickRad) * TICK_HALF * pxScale;
  return (
    <Line points={[x - tx, y - ty, x + tx, y + ty]}
      stroke={colors(kind).dim} strokeWidth={TICK_WIDTH * pxScale} listening={false} />
  );
};

const ChainDimLine = ({ seg, pxScale }: { seg: ChainSegment; pxScale: number }) => {
  const c = colors(seg.kind);
  const { dimLine, labelAnchor, angleDeg } = seg.geom;
  const lineLen = Math.hypot(dimLine.x2 - dimLine.x1, dimLine.y2 - dimLine.y1) || 1;
  const dx = (dimLine.x2 - dimLine.x1) / lineLen;
  const dy = (dimLine.y2 - dimLine.y1) / lineLen;
  const halfGap = seg.metrics.boxWidth / 2 + 3 * pxScale;
  const gx1 = labelAnchor.x - dx * halfGap;
  const gy1 = labelAnchor.y - dy * halfGap;
  const gx2 = labelAnchor.x + dx * halfGap;
  const gy2 = labelAnchor.y + dy * halfGap;

  return (
    <>
      <Line points={[dimLine.x1, dimLine.y1, gx1, gy1]}
        stroke={c.dim} strokeWidth={DIM_LINE_WIDTH * pxScale} listening={false} />
      <Line points={[gx2, gy2, dimLine.x2, dimLine.y2]}
        stroke={c.dim} strokeWidth={DIM_LINE_WIDTH * pxScale} listening={false} />
      <ChainTickMark x={dimLine.x1} y={dimLine.y1} angleDeg={angleDeg} kind={seg.kind} pxScale={pxScale} />
      <ChainTickMark x={dimLine.x2} y={dimLine.y2} angleDeg={angleDeg} kind={seg.kind} pxScale={pxScale} />
    </>
  );
};

const ChainLabel = ({ seg, pxScale }: { seg: ChainSegment; pxScale: number }) => {
  const c = colors(seg.kind);
  const { labelAnchor, angleDeg } = seg.geom;
  const { boxWidth, boxHeight, offsetX, offsetY, fontSize, padding } = seg.metrics;
  return (
    <Group x={labelAnchor.x} y={labelAnchor.y}
      offsetX={offsetX} offsetY={offsetY} rotation={angleDeg} listening={false}>
      <Rect x={0} y={0} width={boxWidth} height={boxHeight}
        fill={c.labelBg} stroke={c.dim} strokeWidth={0.5 * pxScale}
        cornerRadius={LABEL_BG_RADIUS} listening={false} />
      <Text x={padding} y={padding} text={seg.text}
        fontSize={fontSize} fontFamily={LABEL_FONT_FAMILY}
        fill={c.labelFg} listening={false} />
    </Group>
  );
};

const ChainAnnotation = ({ seg, pxScale }: { seg: ChainSegment; pxScale: number }) => (
  <Group listening={false}>
    <ChainExtLines seg={seg} pxScale={pxScale} />
    <ChainDimLine seg={seg} pxScale={pxScale} />
    <ChainLabel seg={seg} pxScale={pxScale} />
  </Group>
);

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

const DimensionChainsRenderer = () => {
  const showAll = useEditorStore((s) => s.showAllDimensions);
  const chains = useDimensionChains();
  const pxScale = useViewportStore((s) => dimensionPxScale(s.scale));
  // Running chains are the densest annotation (the "spaghetti" on mobile); only
  // draw them in the full "show all dimensions" sheet, never in contextual mode.
  if (!showAll || chains.length === 0) return null;

  return (
    <Group listening={false}>
      {chains.map((seg) => (
        <ChainAnnotation key={seg.id} seg={seg} pxScale={pxScale} />
      ))}
    </Group>
  );
};

export default DimensionChainsRenderer;
