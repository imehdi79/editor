/**
 * DimensionRenderer — live drag dimension label.
 *
 * Renders the floating label shown while the user is actively drawing a
 * segment. This is separate from DimensionLayerRenderer which handles
 * committed-shape annotations.
 *
 * Centering pattern (Konva rotation-about-center):
 *   1. Position the Group at (anchorX, anchorY)
 *   2. Set Group offsetX = halfBoxW, offsetY = halfBoxH
 *      → this shifts the Group's local origin to its own center
 *   3. Apply rotation on the Group
 *      → Konva rotates around (anchorX - offsetX, anchorY - offsetY)
 *        which is the GROUP's own center — correct.
 *   4. Rect starts at (0, 0) within the Group, sized (boxW × boxH)
 *   5. Text starts at (PADDING, PADDING) within the Group
 *
 * Result: the text box is perfectly centered on anchorX/anchorY and
 * rotates around that point at angleDeg — never off-center regardless
 * of angle or text length.
 */

import { Group, Rect, Text, Shape as KonvaShape } from "react-konva";
import type { DrawingHints } from "@/core/drawing-engine/drawing.types";
import type { CornerAngle } from "@/core/wall-utils/wallAngles";
import { formatAngle } from "@/core/wall-utils/wallAngles";
import { useViewportStore } from "@/store/viewport.store";
import { LABEL_FONT_SIZE, LABEL_FONT_FAMILY, LABEL_PADDING, dimensionPxScale } from "@/core/dimensions/dimensionLayout";

const LIVE_BG_COLOR = "#fffbeb"; // warm tint — distinguishes live from committed
const LIVE_TEXT_COLOR = "#1e293b";
const LIVE_PERP_COLOR = "#a855f7"; // purple when perpendicular lock active
const LIVE_BG_STROKE = "#fbbf24"; // amber border matches perpLocked color
const LIVE_STROKE_NORMAL = "#94a3b8";
const CORNER_RADIUS = 2;

// Corner-angle arc (shown only when chaining off an existing wall).
const CORNER_COLOR = "#0ea5e9"; // sky-blue — distinct from length (amber) & locks
const CORNER_ARC_RADIUS = 26; // screen px before zoom compensation
const CHAR_WIDTH = LABEL_FONT_SIZE * 0.6;

interface Props {
  hints: DrawingHints;
}

// ---------------------------------------------------------------------------
// Corner-angle arc — a small protractor reading at the chained vertex.
// ---------------------------------------------------------------------------

const CornerAngleArc = ({ corner, pxScale }: { corner: CornerAngle; pxScale: number }) => {
  const r = CORNER_ARC_RADIUS * pxScale;
  const labelR = r + 12 * pxScale;
  const lx = corner.vx + Math.cos(corner.midRad) * labelR;
  const ly = corner.vy + Math.sin(corner.midRad) * labelR;

  const text = formatAngle(corner.cornerDeg);
  const boxW = text.length * CHAR_WIDTH + LABEL_PADDING * 2;
  const boxH = LABEL_FONT_SIZE * 1.2 + LABEL_PADDING * 2;

  return (
    <>
      <KonvaShape
        sceneFunc={(ctx) => {
          ctx.beginPath();
          ctx.arc(corner.vx, corner.vy, r, corner.startRad, corner.endRad, corner.anticlockwise);
          ctx.strokeStyle = CORNER_COLOR;
          ctx.lineWidth = 1.5 * pxScale;
          ctx.stroke();
        }}
        listening={false}
      />
      {/* Angle label, centered and counter-scaled (kept upright, not rotated) */}
      <Group x={lx} y={ly} offsetX={boxW / 2} offsetY={boxH / 2} scaleX={pxScale} scaleY={pxScale} listening={false}>
        <Rect
          width={boxW}
          height={boxH}
          fill="#f0f9ff"
          stroke={CORNER_COLOR}
          strokeWidth={0.75}
          cornerRadius={CORNER_RADIUS}
          listening={false}
        />
        <Text
          x={LABEL_PADDING}
          y={LABEL_PADDING}
          text={text}
          fontSize={LABEL_FONT_SIZE}
          fontFamily={LABEL_FONT_FAMILY}
          fill={CORNER_COLOR}
          listening={false}
        />
      </Group>
    </>
  );
};

const DimensionRenderer = ({ hints }: Props) => {
  const pxScale = useViewportStore((s) => dimensionPxScale(s.scale));
  const { dimension, perpLocked } = hints;
  if (!dimension || dimension.lengthPx < 8) return null;

  const { anchorX, anchorY, halfBoxW, halfBoxH, text, angleDeg } = dimension;

  const boxW = halfBoxW * 2;
  const boxH = halfBoxH * 2;
  const textColor = perpLocked ? LIVE_PERP_COLOR : LIVE_TEXT_COLOR;
  const strokeColor = perpLocked ? LIVE_BG_STROKE : LIVE_STROKE_NORMAL;

  // Counter-scale on zoom-out so the live label stays readable. Scaling the
  // group about its centered offset keeps it anchored on the segment midpoint.
  return (
    <>
      <Group
        x={anchorX}
        y={anchorY}
        offsetX={halfBoxW}
        offsetY={halfBoxH}
        rotation={angleDeg}
        scaleX={pxScale}
        scaleY={pxScale}
        listening={false}
      >
        <Rect
          x={0}
          y={0}
          width={boxW}
          height={boxH}
          fill={LIVE_BG_COLOR}
          stroke={strokeColor}
          strokeWidth={0.75}
          cornerRadius={CORNER_RADIUS}
          listening={false}
        />
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

      {/* Corner angle vs the previous connected wall — only while chaining */}
      {dimension.corner && <CornerAngleArc corner={dimension.corner} pxScale={pxScale} />}
    </>
  );
};

export default DimensionRenderer;
