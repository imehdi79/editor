/**
 * DimensionLayerRenderer — Layer 5 of the dimension system.
 *
 * Pure Konva renderer: takes resolved DimensionCandidates and draws the
 * complete CAD-grade annotation for each:
 *
 *   • Extension lines (witness lines) — from segment endpoints to dim line
 *   • Dimension line — parallel to segment at offset distance, with a gap
 *     cut out where the label sits
 *   • Tick terminators — 45° architectural style tick marks at each end
 *   • Label — precisely centered text on a white-backed pill
 *   • Conflict indicator — reduced opacity + orange tint for unresolved overlaps
 *
 * All measurements in canvas pixels. listening={false} on every node.
 */

import { Line, Text, Group, Rect } from "react-konva";
import { useDimensionLayout } from "@/core/dimensions/useDimensionLayout";
import type { DimensionCandidate } from "@/core/dimensions/dimensionCollision";
import { TICK_HALF } from "@/core/dimensions/dimensionGeometry";
import { LABEL_FONT_SIZE, LABEL_FONT_FAMILY, LABEL_PADDING } from "@/core/dimensions/dimensionLayout";

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

const DIM_LINE_COLOR = "#475569";      // slate-600 — restrained, professional
const EXT_LINE_COLOR = "#94a3b8";      // slate-400 — lighter than dim line
const LABEL_TEXT_COLOR = "#1e293b";    // slate-900
const LABEL_BG_COLOR = "#ffffff";
const LABEL_BG_STROKE = "#cbd5e1";    // slate-300
const CONFLICT_COLOR = "#f97316";      // orange-500 — visible but not alarming

const DIM_LINE_WIDTH = 0.75;
const EXT_LINE_WIDTH = 0.75;
const TICK_WIDTH = 1;
const LABEL_BG_RADIUS = 2;            // rounded corners on label pill

// ---------------------------------------------------------------------------
// Sub-renderers
// ---------------------------------------------------------------------------

/**
 * Extension line pair for one dimension annotation.
 */
const ExtensionLines = ({
  geom,
  conflicted,
}: {
  geom: DimensionCandidate["geom"];
  conflicted: boolean;
}) => {
  const opacity = conflicted ? 0.4 : 0.8;
  const color = conflicted ? CONFLICT_COLOR : EXT_LINE_COLOR;

  return (
    <>
      <Line
        points={[geom.extLine1.x1, geom.extLine1.y1, geom.extLine1.x2, geom.extLine1.y2]}
        stroke={color}
        strokeWidth={EXT_LINE_WIDTH}
        opacity={opacity}
        listening={false}
      />
      <Line
        points={[geom.extLine2.x1, geom.extLine2.y1, geom.extLine2.x2, geom.extLine2.y2]}
        stroke={color}
        strokeWidth={EXT_LINE_WIDTH}
        opacity={opacity}
        listening={false}
      />
    </>
  );
};

/**
 * Tick terminator at a point on the dimension line.
 * Architectural style: 45° line through the endpoint.
 */
const TickMark = ({
  x,
  y,
  angleDeg,
  conflicted,
}: {
  x: number;
  y: number;
  angleDeg: number;
  conflicted: boolean;
}) => {
  // Tick is drawn at 45° relative to the dimension line direction
  const tickAngleRad = ((angleDeg + 90) * Math.PI) / 180;
  const tx = Math.cos(tickAngleRad) * TICK_HALF;
  const ty = Math.sin(tickAngleRad) * TICK_HALF;

  return (
    <Line
      points={[x - tx, y - ty, x + tx, y + ty]}
      stroke={conflicted ? CONFLICT_COLOR : DIM_LINE_COLOR}
      strokeWidth={TICK_WIDTH}
      opacity={conflicted ? 0.4 : 1}
      listening={false}
    />
  );
};

/**
 * The dimension line itself, rendered as two segments with a gap in the
 * middle where the label sits. The gap prevents the line from running
 * through the text.
 */
const DimLine = ({
  geom,
  labelGapHalfWidth,
  conflicted,
}: {
  geom: DimensionCandidate["geom"];
  labelGapHalfWidth: number;
  conflicted: boolean;
}) => {
  const { dimLine, labelAnchor, angleDeg } = geom;
  const color = conflicted ? CONFLICT_COLOR : DIM_LINE_COLOR;
  const opacity = conflicted ? 0.4 : 1;

  // Direction along the dimension line
  const lineLen = Math.hypot(dimLine.x2 - dimLine.x1, dimLine.y2 - dimLine.y1) || 1;
  const dx = (dimLine.x2 - dimLine.x1) / lineLen;
  const dy = (dimLine.y2 - dimLine.y1) / lineLen;

  // Gap endpoints (gap = labelGapHalfWidth + a small clearance on each side)
  const gapClearance = 3; // px extra clearance beyond label edge
  const halfGap = labelGapHalfWidth + gapClearance;

  const gapX1 = labelAnchor.x - dx * halfGap;
  const gapY1 = labelAnchor.y - dy * halfGap;
  const gapX2 = labelAnchor.x + dx * halfGap;
  const gapY2 = labelAnchor.y + dy * halfGap;

  return (
    <>
      {/* Left segment of dimension line */}
      <Line
        points={[dimLine.x1, dimLine.y1, gapX1, gapY1]}
        stroke={color}
        strokeWidth={DIM_LINE_WIDTH}
        opacity={opacity}
        listening={false}
      />
      {/* Right segment of dimension line */}
      <Line
        points={[gapX2, gapY2, dimLine.x2, dimLine.y2]}
        stroke={color}
        strokeWidth={DIM_LINE_WIDTH}
        opacity={opacity}
        listening={false}
      />
      {/* Tick marks at each end */}
      <TickMark x={dimLine.x1} y={dimLine.y1} angleDeg={angleDeg} conflicted={conflicted} />
      <TickMark x={dimLine.x2} y={dimLine.y2} angleDeg={angleDeg} conflicted={conflicted} />
    </>
  );
};

/**
 * Label: white-backed pill with precisely centered text.
 *
 * Centering via Konva:
 *   - Text node positioned at labelAnchor (cx, cy of the OBB)
 *   - offsetX = boxWidth / 2  → left edge of box is at anchor − half-width
 *   - offsetY = boxHeight / 2 → top edge of box is at anchor − half-height
 *   - rotation applied AFTER offset → rotates around the anchor (text center)
 *
 * This is the correct pattern for rotation-about-center in Konva.
 */
const DimLabel = ({
  candidate,
}: {
  candidate: DimensionCandidate;
}) => {
  const { geom, text, metrics, conflicted } = candidate;
  const { labelAnchor, angleDeg } = geom;
  const { boxWidth, boxHeight, offsetX, offsetY } = metrics;

  const textColor = conflicted ? CONFLICT_COLOR : LABEL_TEXT_COLOR;
  const bgStroke = conflicted ? CONFLICT_COLOR : LABEL_BG_STROKE;

  return (
    <Group
      x={labelAnchor.x}
      y={labelAnchor.y}
      offsetX={offsetX}
      offsetY={offsetY}
      rotation={angleDeg}
      listening={false}
    >
      {/* Background pill */}
      <Rect
        x={0}
        y={0}
        width={boxWidth}
        height={boxHeight}
        fill={LABEL_BG_COLOR}
        stroke={bgStroke}
        strokeWidth={0.5}
        cornerRadius={LABEL_BG_RADIUS}
        listening={false}
      />
      {/* Text — centered within the box */}
      <Text
        x={LABEL_PADDING}
        y={LABEL_PADDING}
        text={text}
        fontSize={LABEL_FONT_SIZE}
        fontFamily={LABEL_FONT_FAMILY}
        fill={textColor}
        listening={false}
      />
    </Group>
  );
};

// ---------------------------------------------------------------------------
// Single dimension annotation
// ---------------------------------------------------------------------------

const DimensionAnnotation = ({ candidate }: { candidate: DimensionCandidate }) => {
  const { geom, metrics, conflicted } = candidate;

  return (
    <Group listening={false}>
      <ExtensionLines geom={geom} conflicted={conflicted} />
      <DimLine
        geom={geom}
        labelGapHalfWidth={metrics.boxWidth / 2}
        conflicted={conflicted}
      />
      <DimLabel candidate={candidate} />
    </Group>
  );
};

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

const DimensionLayerRenderer = () => {
  const candidates = useDimensionLayout();

  if (candidates.length === 0) return null;

  return (
    <Group listening={false}>
      {candidates.map((c) => (
        <DimensionAnnotation key={c.id} candidate={c} />
      ))}
    </Group>
  );
};

export default DimensionLayerRenderer;
