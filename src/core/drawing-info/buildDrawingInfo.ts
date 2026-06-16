/**
 * buildDrawingInfo — pure data layer for the drawing information table.
 *
 * One row per shape (no bucketing) so every editable cell maps to exactly one
 * shape. Adds Height (walls) and Area columns: walls report surface area
 * (length × height), and enclosed wall loops are reported as separate Room
 * rows with floor area. Each cell exposes its raw value + the shape field it
 * edits, so the DOM panel can write changes straight back to a single shape.
 *
 * No React, no Konva, no side effects.
 */

import type { Shape } from "@/core/drawing-engine/drawing.types";
import type { DimensionUnit } from "@/store/editor.store";
import { formatDimension, formatArea, toUnit, cmToPx } from "@/core/dimensions/dimensionUnits";
import { computeRoomAreas } from "./computeRoomAreas";

/** Which shape field a given cell edits. */
export type EditField = "length" | "thickness" | "width" | "height";

export interface DrawingCell {
  display: string;
  /** Raw value shown in the input, in the active display unit. */
  value?: number;
  /** Field this cell writes to; absent = read-only (derived) cell. */
  field?: EditField;
}

export interface DrawingRow {
  /** Shape id, or room cycle id for room rows */
  id: string;
  kind: "wall" | "window" | "door" | "line" | "dashed-line" | "text" | "room";
  type: string;
  length: DrawingCell;
  width: DrawingCell;
  height: DrawingCell;
  area: DrawingCell;
}

const EMPTY: DrawingCell = { display: "—" };
const segLen = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);

export const buildDrawingInfo = (
  shapes: Record<string, Shape>,
  unit: DimensionUnit,
  pixelsPerMeter: number,
  defaultWallHeight: number,
): DrawingRow[] => {
  const fmt = (px: number) => formatDimension(px, unit, pixelsPerMeter);
  const lenCell = (px: number, field: EditField): DrawingCell => ({
    display: fmt(px),
    value: toUnit(px, unit, pixelsPerMeter),
    field,
  });

  const rows: DrawingRow[] = [];

  for (const s of Object.values(shapes)) {
    if (s.type === "wall") {
      const l = segLen(s.x1, s.y1, s.x2, s.y2);
      const h = s.height ?? defaultWallHeight;
      const surfaceM2 = (l / pixelsPerMeter) * (h / 100);
      rows.push({
        id: s.id,
        kind: "wall",
        type: "Wall",
        length: lenCell(l, "length"),
        width: lenCell(s.thickness, "thickness"),
        // Height is stored in cm; bridge to px so it displays/edits in the active unit.
        height: lenCell(cmToPx(h, pixelsPerMeter), "height"),
        area: { display: formatArea(surfaceM2) },
      });
    } else if (s.type === "window" || s.type === "door") {
      rows.push({
        id: s.id,
        kind: s.type,
        type: s.type === "window" ? "Window" : "Door",
        length: lenCell(s.width, "width"),
        width: lenCell(s.thickness, "thickness"),
        height: EMPTY,
        area: EMPTY,
      });
    } else if (s.type === "line" || s.type === "dashed-line") {
      const l = segLen(s.x1, s.y1, s.x2, s.y2);
      rows.push({
        id: s.id,
        kind: s.type,
        type: s.type === "line" ? "Line" : "Dashed Line",
        length: lenCell(l, "length"),
        width: EMPTY,
        height: EMPTY,
        area: EMPTY,
      });
    } else {
      rows.push({ id: s.id, kind: "text", type: "Text", length: EMPTY, width: EMPTY, height: EMPTY, area: EMPTY });
    }
  }

  const ORDER: Record<DrawingRow["kind"], number> = {
    wall: 0,
    window: 1,
    door: 2,
    line: 3,
    "dashed-line": 4,
    text: 5,
    room: 6,
  };
  rows.sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);

  // Enclosed rooms — appended as a summary section with floor area.
  const rooms = computeRoomAreas(shapes);
  rooms
    .sort((a, b) => b.areaPx - a.areaPx)
    .forEach((room, i) => {
      rows.push({
        id: room.id,
        kind: "room",
        type: `Room ${i + 1}`,
        length: EMPTY,
        width: EMPTY,
        height: EMPTY,
        area: { display: formatArea(room.areaPx / (pixelsPerMeter * pixelsPerMeter)) },
      });
    });

  return rows;
};
