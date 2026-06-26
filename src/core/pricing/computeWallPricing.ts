/**
 * computeWallPricing — pure cost takeoff for walls.
 *
 * Turns a wall's composite assembly into priced line items: each construction
 * layer is quantified (area / length / volume / piece count) per its material's
 * billing rule and multiplied by the rate. Renovation phase drives what counts:
 *   - a NEW wall is priced as new construction (all layers built);
 *   - an EXISTING (retained) wall has zero build cost — it is not rebuilt;
 *   - an EXISTING wall flagged for DEMOLITION adds a demolition line, priced per
 *     m² of wall surface (the only cost a demolished wall carries).
 *
 * No React, no Konva, no store — the store hands in the live rates.
 */

import type { ArcWallShape, WallShape, LayerFunction } from "@/core/drawing-engine/drawing.types";
import { wallAssembly } from "@/core/wall-layers/wallAssembly";
import { layeredWallLength } from "@/core/wall-layers/buildWallLayerRows";
import {
  type MaterialRate,
  type PricingUnit,
  DEFAULT_RATE,
  rateKeyOf,
} from "./pricingRates";

export interface PricingLayerLine {
  layerId: string;
  /** Raw material name ("" = structural core) — caller maps to a label. */
  material: string;
  function: LayerFunction;
  isCore: boolean;
  unit: PricingUnit;
  /** Quantity in the billing unit (m², m, m³, or piece count). */
  quantity: number;
  rate: number;
  cost: number;
}

export interface WallPricing {
  wallId: string;
  existing: boolean;
  demolish: boolean;
  /** Wall surface area (m²) — length × height; basis for area/demolition. */
  areaM2: number;
  layers: PricingLayerLine[];
  /** Sum of layer costs — 0 for a retained existing wall (not built new). */
  layersCost: number;
  /** Demolition cost — non-zero only for an existing wall flagged demolish. */
  demolishCost: number;
  /** layersCost + demolishCost. */
  total: number;
}

type LayeredWall = WallShape | ArcWallShape;

/**
 * Quantity of a single layer in its billing unit, given the wall's metre-space
 * dimensions. `area`/`length`/`volume` are geometric; `piece` converts the area
 * or volume to a count via the rate's `piecesPerUnit`.
 */
const layerQuantity = (
  rate: MaterialRate,
  lengthM: number,
  heightM: number,
  thicknessM: number,
): number => {
  const areaM2 = lengthM * heightM;
  const volumeM3 = areaM2 * thicknessM;
  switch (rate.unit) {
    case "area":
      return areaM2;
    case "length":
      return lengthM;
    case "volume":
      return volumeM3;
    case "piece": {
      const basis = rate.pieceBasis === "volume" ? volumeM3 : areaM2;
      return basis * (rate.piecesPerUnit ?? 0);
    }
  }
};

export const computeWallPricing = (
  wall: LayeredWall,
  rates: Record<string, MaterialRate>,
  demolishRate: number,
  pixelsPerMeter: number,
  defaultWallHeight: number,
): WallPricing => {
  const lengthM = layeredWallLength(wall) / pixelsPerMeter;
  const heightM = (wall.height ?? defaultWallHeight) / 100; // height stored in cm
  const areaM2 = lengthM * heightM;
  const existing = wall.existing === true;
  const demolish = existing && wall.demolish === true;

  const layers: PricingLayerLine[] = wallAssembly(wall).layers.map((l) => {
    const rate = rates[rateKeyOf(l.material)] ?? DEFAULT_RATE;
    const quantity = layerQuantity(rate, lengthM, heightM, l.thickness / pixelsPerMeter);
    // Retained existing walls are not rebuilt, so their layers cost nothing.
    const cost = existing ? 0 : quantity * rate.rate;
    return {
      layerId: l.id,
      material: l.material,
      function: l.function,
      isCore: l.isCore,
      unit: rate.unit,
      quantity,
      rate: rate.rate,
      cost,
    };
  });

  const layersCost = layers.reduce((s, l) => s + l.cost, 0);
  const demolishCost = demolish ? areaM2 * demolishRate : 0;

  return {
    wallId: wall.id,
    existing,
    demolish,
    areaM2,
    layers,
    layersCost,
    demolishCost,
    total: layersCost + demolishCost,
  };
};

export interface PricingTakeoff {
  walls: WallPricing[];
  /** Grand total across every wall (new construction + demolition). */
  total: number;
}

/** Price every wall / arc-wall in the document (in document order). */
export const computePricingTakeoff = (
  shapes: Record<string, { type: string }>,
  rates: Record<string, MaterialRate>,
  demolishRate: number,
  pixelsPerMeter: number,
  defaultWallHeight: number,
): PricingTakeoff => {
  const walls: WallPricing[] = [];
  for (const s of Object.values(shapes)) {
    if (s.type === "wall" || s.type === "arc-wall") {
      walls.push(
        computeWallPricing(s as LayeredWall, rates, demolishRate, pixelsPerMeter, defaultWallHeight),
      );
    }
  }
  return { walls, total: walls.reduce((sum, w) => sum + w.total, 0) };
};

/** Format a currency amount: grouped integer + the currency label. */
export const formatMoney = (value: number, currency: string): string => {
  const n = Math.round(value);
  const grouped = new Intl.NumberFormat("en-US").format(n);
  return currency ? `${grouped} ${currency}` : grouped;
};

/** Compact quantity for table display (≤2 decimals, trailing zeros trimmed). */
export const formatQuantity = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
};
