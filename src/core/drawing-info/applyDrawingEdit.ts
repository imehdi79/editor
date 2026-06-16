/**
 * applyDrawingEdit — commit a single edited drawing-info cell back to its shape.
 *
 * Shared by the canvas table's DOM edit overlay (and previously the DOM panel).
 * Pure of any store import: `shapes` and `updateShape` are passed in, so this
 * stays a thin translation from "value in display unit" → shape patch.
 *
 * Edit semantics (value already in the current display unit):
 *   length    — keep p1 fixed, move p2 along the segment to the new length
 *   thickness — set the wall/opening thickness
 *   width     — resize an opening symmetrically about its center along the wall
 *   height    — set the wall height (stored in cm; no 2D effect)
 */

import type { Shape } from "@/core/drawing-engine/drawing.types";
import type { DimensionUnit } from "@/store/editor.store";
import { toPx, pxToCm } from "@/core/dimensions/dimensionUnits";
import type { EditField } from "./buildDrawingInfo";

type ShapePatch = Partial<Omit<Shape, "id" | "type">>;

export const applyDrawingEdit = (
  shapes: Record<string, Shape>,
  updateShape: (id: string, patch: ShapePatch) => void,
  unit: DimensionUnit,
  pixelsPerMeter: number,
  rowId: string,
  field: EditField,
  valueInUnit: number,
): void => {
  const s = shapes[rowId];
  if (!s || s.type === "text") return;

  if (field === "height") {
    // Height is stored in cm; value arrives in the display unit → px → cm.
    const cm = pxToCm(toPx(valueInUnit, unit, pixelsPerMeter), pixelsPerMeter);
    updateShape(s.id, { height: Math.max(1, cm) });
    return;
  }

  const px = Math.max(1, toPx(valueInUnit, unit, pixelsPerMeter));

  if (field === "thickness") {
    updateShape(s.id, { thickness: px });
  } else if (field === "length" && (s.type === "wall" || s.type === "line" || s.type === "dashed-line")) {
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1;
    const ux = (s.x2 - s.x1) / len;
    const uy = (s.y2 - s.y1) / len;
    updateShape(s.id, { x2: s.x1 + ux * px, y2: s.y1 + uy * px });
  } else if (field === "width" && (s.type === "window" || s.type === "door")) {
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1;
    const ux = (s.x2 - s.x1) / len;
    const uy = (s.y2 - s.y1) / len;
    const cx = (s.x1 + s.x2) / 2;
    const cy = (s.y1 + s.y2) / 2;
    updateShape(s.id, {
      x1: cx - ux * (px / 2),
      y1: cy - uy * (px / 2),
      x2: cx + ux * (px / 2),
      y2: cy + uy * (px / 2),
      width: px,
    });
  }
};
