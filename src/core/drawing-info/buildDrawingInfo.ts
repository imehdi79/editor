/**
 * buildDrawingInfo — pure data layer for the drawing information table.
 * Derives a structured summary from floor-plan shapes + dimension units.
 * No React, no Konva, no side effects.
 */

import type { Shape } from "@/core/drawing-engine/drawing.types";
import type { DimensionUnit, MeasurementReference } from "@/store/editor.store";
import { formatDimension } from "@/core/dimensions/dimensionUnits";
import { measuredWallLength } from "@/core/dimensions/measurementReference";

export interface DrawingRow {
  type: string;
  label: string;
  length: string;
  width: string;
  quantity: number;
  meta: Record<string, string>;
}

export interface DrawingInfoTable {
  rows: DrawingRow[];
  rightmostX: number;
  bottommostY: number;
}

const fmt = (px: number, unit: DimensionUnit, ppm: number) => formatDimension(px, unit, ppm);
const segLen = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);

export const buildDrawingInfo = (
  shapes: Record<string, Shape>,
  unit: DimensionUnit,
  pixelsPerMeter: number,
  reference: MeasurementReference = "centerline",
): DrawingInfoTable => {
  type Acc = { count: number; rep: Shape };
  const buckets = new Map<string, Acc>();
  let rightmostX = 0;
  let bottommostY = 0;

  for (const shape of Object.values(shapes)) {
    if (shape.type !== "text") {
      rightmostX = Math.max(rightmostX, shape.x1, shape.x2);
      bottommostY = Math.max(bottommostY, shape.y1, shape.y2);
    } else {
      rightmostX = Math.max(rightmostX, shape.x);
      bottommostY = Math.max(bottommostY, shape.y);
    }

    let key: string;
    if (shape.type === "wall") {
      const l = measuredWallLength(shape, shapes, reference);
      key = `wall|${Math.round(l)}|${shape.thickness}`;
    } else if (shape.type === "window") key = `window|${Math.round(shape.width)}`;
    else if (shape.type === "door") key = `door|${Math.round(shape.width)}|${shape.swingDirection}|${shape.hingeSide}`;
    else if (shape.type === "line") key = `line|${Math.round(segLen(shape.x1, shape.y1, shape.x2, shape.y2))}`;
    else if (shape.type === "dashed-line") key = `dashed|${Math.round(segLen(shape.x1, shape.y1, shape.x2, shape.y2))}`;
    else key = "text";

    const ex = buckets.get(key);
    if (ex) ex.count++;
    else buckets.set(key, { count: 1, rep: shape });
  }

  const rows: DrawingRow[] = [];
  for (const { count, rep } of buckets.values()) {
    if (rep.type === "wall") {
      const l = measuredWallLength(rep, shapes, reference);
      rows.push({
        type: "Wall",
        label: `Wall ${fmt(l, unit, pixelsPerMeter)}`,
        length: fmt(l, unit, pixelsPerMeter),
        width: fmt(rep.thickness, unit, pixelsPerMeter),
        quantity: count,
        meta: { Thickness: fmt(rep.thickness, unit, pixelsPerMeter) },
      });
    } else if (rep.type === "window") {
      rows.push({
        type: "Window",
        label: `Window ${fmt(rep.width, unit, pixelsPerMeter)}`,
        length: fmt(rep.width, unit, pixelsPerMeter),
        width: fmt(rep.thickness, unit, pixelsPerMeter),
        quantity: count,
        meta: {},
      });
    } else if (rep.type === "door") {
      rows.push({
        type: "Door",
        label: `Door ${fmt(rep.width, unit, pixelsPerMeter)}`,
        length: fmt(rep.width, unit, pixelsPerMeter),
        width: fmt(rep.thickness, unit, pixelsPerMeter),
        quantity: count,
        meta: { Swing: rep.swingDirection, Hinge: rep.hingeSide },
      });
    } else if (rep.type === "line") {
      const l = segLen(rep.x1, rep.y1, rep.x2, rep.y2);
      rows.push({
        type: "Line",
        label: `Line ${fmt(l, unit, pixelsPerMeter)}`,
        length: fmt(l, unit, pixelsPerMeter),
        width: "—",
        quantity: count,
        meta: {},
      });
    } else if (rep.type === "dashed-line") {
      const l = segLen(rep.x1, rep.y1, rep.x2, rep.y2);
      rows.push({
        type: "Dashed Line",
        label: `Dashed ${fmt(l, unit, pixelsPerMeter)}`,
        length: fmt(l, unit, pixelsPerMeter),
        width: "—",
        quantity: count,
        meta: {},
      });
    } else {
      rows.push({ type: "Text", label: "Text Label", length: "—", width: "—", quantity: count, meta: {} });
    }
  }

  const ORDER: Record<string, number> = { Wall: 0, Window: 1, Door: 2, Line: 3, "Dashed Line": 4, Text: 5 };
  rows.sort((a, b) => (ORDER[a.type] ?? 9) - (ORDER[b.type] ?? 9));
  return { rows, rightmostX, bottommostY };
};
