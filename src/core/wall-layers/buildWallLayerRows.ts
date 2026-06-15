/**
 * buildWallLayerRows — pure data layer for a wall's per-side layer table.
 *
 * Mirrors the drawing-info table's columns (Type / Length / Width / Height /
 * Area) so layers read consistently with the rest of the takeoff, but is
 * rendered as a DOM table inside the wall panel — never on the canvas, never
 * dimensioned. Length and Height are inherited from the host wall (read-only);
 * Width is the layer's own build-up thickness (editable); Area is the wall
 * surface (length × height) the layer covers.
 *
 * No React, no Konva, no side effects.
 */

import type { WallShape, WallSide } from "@/core/drawing-engine/drawing.types";
import type { DimensionUnit } from "@/store/editor.store";
import { formatDimension, formatArea, toUnit } from "@/core/dimensions/dimensionUnits";
import { wallLength } from "@/core/wall-utils/wallGeometry";
import { layersOf } from "./wallLayers";

export interface WallLayerRow {
  id: string;
  /** Editable material name (Type column). */
  material: string;
  /** Layer thickness in the active display unit — backs the Width input. */
  thicknessValue: number;
  /** Pre-formatted display strings for the read-only / derived columns. */
  lengthDisplay: string;
  widthDisplay: string;
  heightDisplay: string;
  areaDisplay: string;
}

export const buildWallLayerRows = (
  wall: WallShape,
  side: WallSide,
  unit: DimensionUnit,
  pixelsPerMeter: number,
  defaultWallHeight: number,
): WallLayerRow[] => {
  const len = wallLength(wall);
  const h = wall.height ?? defaultWallHeight;
  const surfaceM2 = (len / pixelsPerMeter) * (h / 100);
  const lengthDisplay = formatDimension(len, unit, pixelsPerMeter);
  const heightDisplay = `${h}cm`;
  const areaDisplay = formatArea(surfaceM2);

  return layersOf(wall, side).map((layer) => ({
    id: layer.id,
    material: layer.material,
    thicknessValue: toUnit(layer.thickness, unit, pixelsPerMeter),
    lengthDisplay,
    widthDisplay: formatDimension(layer.thickness, unit, pixelsPerMeter),
    heightDisplay,
    areaDisplay,
  }));
};
