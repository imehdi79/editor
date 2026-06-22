/**
 * buildWallLayerRows — pure data layer for a wall's takeoff layer detail.
 *
 * Reads the wall's resolved composite assembly (exterior→interior), so every
 * construction layer — including the structural core — is listed with its
 * length × width(thickness) × height × area. Mirrors the drawing-info columns;
 * rendered as a read-only detail band under the selected wall, never on canvas
 * geometry and never dimensioned.
 *
 * No React, no Konva, no side effects.
 */

import type { ArcWallShape, LayerFunction, WallShape } from "@/core/drawing-engine/drawing.types";
import type { DimensionUnit } from "@/store/editor.store";
import { formatDimension, formatArea, toUnit, cmToPx } from "@/core/dimensions/dimensionUnits";
import { wallLength } from "@/core/wall-utils/wallGeometry";
import { arcFromChordBulge } from "@/core/arc/arcGeometry";
import { wallAssembly } from "./wallAssembly";

/** Construction length of a wall — true arc length for an arc, chord otherwise. */
export const layeredWallLength = (wall: WallShape | ArcWallShape): number =>
  wall.type === "arc-wall"
    ? (arcFromChordBulge(wall.x1, wall.y1, wall.x2, wall.y2, wall.bulge)?.length ??
        Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1))
    : wallLength(wall);

export interface WallLayerRow {
  id: string;
  /** Material name; "" for the structural core (label it by `function`). */
  material: string;
  /** BIM function (junction priority) — also labels a core/empty-material row. */
  function: LayerFunction;
  isCore: boolean;
  /** Layer thickness in the active display unit. */
  thicknessValue: number;
  /** Pre-formatted display strings for the table columns. */
  lengthDisplay: string;
  widthDisplay: string;
  heightDisplay: string;
  areaDisplay: string;
}

export const buildWallLayerRows = (
  wall: WallShape | ArcWallShape,
  unit: DimensionUnit,
  pixelsPerMeter: number,
  defaultWallHeight: number,
): WallLayerRow[] => {
  const len = layeredWallLength(wall);
  const h = wall.height ?? defaultWallHeight;
  const surfaceM2 = (len / pixelsPerMeter) * (h / 100);
  const lengthDisplay = formatDimension(len, unit, pixelsPerMeter);
  const heightDisplay = formatDimension(cmToPx(h, pixelsPerMeter), unit, pixelsPerMeter);
  const areaDisplay = formatArea(surfaceM2);

  return wallAssembly(wall).layers.map((l) => ({
    id: l.id,
    material: l.material,
    function: l.function,
    isCore: l.isCore,
    thicknessValue: toUnit(l.thickness, unit, pixelsPerMeter),
    lengthDisplay,
    widthDisplay: formatDimension(l.thickness, unit, pixelsPerMeter),
    heightDisplay,
    areaDisplay,
  }));
};
