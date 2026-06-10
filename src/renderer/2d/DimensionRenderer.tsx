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

import { Group, Rect, Text } from "react-konva";
import type { DrawingHints } from "@/core/drawing-engine/drawing.types";
import { LABEL_FONT_SIZE, LABEL_FONT_FAMILY, LABEL_PADDING } from "@/core/dimensions/dimensionLayout";

const LIVE_BG_COLOR = "#fffbeb"; // warm tint — distinguishes live from committed
const LIVE_TEXT_COLOR = "#1e293b";
const LIVE_PERP_COLOR = "#a855f7"; // purple when perpendicular lock active
const LIVE_BG_STROKE = "#fbbf24"; // amber border matches perpLocked color
const LIVE_STROKE_NORMAL = "#94a3b8";
const CORNER_RADIUS = 2;

interface Props {
  hints: DrawingHints;
}

const DimensionRenderer = ({ hints }: Props) => {
  const { dimension, perpLocked } = hints;
  if (!dimension || dimension.lengthPx < 8) return null;

  const { anchorX, anchorY, halfBoxW, halfBoxH, text, angleDeg } = dimension;

  const boxW = halfBoxW * 2;
  const boxH = halfBoxH * 2;
  const textColor = perpLocked ? LIVE_PERP_COLOR : LIVE_TEXT_COLOR;
  const strokeColor = perpLocked ? LIVE_BG_STROKE : LIVE_STROKE_NORMAL;

  return (
    <Group x={anchorX} y={anchorY} offsetX={halfBoxW} offsetY={halfBoxH} rotation={angleDeg} listening={false}>
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
  );
};

export default DimensionRenderer;
