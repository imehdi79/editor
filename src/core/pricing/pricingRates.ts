/**
 * pricingRates — the pure pricing-rule model: how a material/layer is billed.
 *
 * Framework-free domain model (no React, no Konva, no store). The pricing store
 * holds the live rate values; this module defines their shape and the small
 * helpers that resolve a layer's rate. Mirrors how `core/` owns the data model
 * and the store only holds state.
 */

import { WALL_MATERIALS } from "@/core/wall-layers/wallLayers";

/**
 * PricingUnit — how a construction layer / material is billed.
 *
 *   "area"   → price × wall surface area (length × height), m²
 *   "length" → price × wall run length, m (skirting, joints, linear runs)
 *   "piece"  → price × piece count; the count is derived from the layer's area
 *              or volume via `piecesPerUnit` (e.g. bricks per m³)
 *   "volume" → price × layer volume (length × height × thickness), m³
 */
export type PricingUnit = "area" | "length" | "piece" | "volume";

/** What a piece count is measured against, when `unit === "piece"`. */
export type PieceBasis = "area" | "volume";

/** Pricing units in display order. */
export const PRICING_UNITS = ["area", "length", "piece", "volume"] as const satisfies readonly PricingUnit[];

/**
 * MaterialRate — the billing rule for one material (or the structural core).
 * `rate` is currency per unit. For `unit === "piece"`, `piecesPerUnit` is the
 * number of pieces per m² (basis "area") or per m³ (basis "volume"), so the
 * geometric quantity converts to a piece count.
 */
export interface MaterialRate {
  unit: PricingUnit;
  rate: number;
  piecesPerUnit?: number;
  pieceBasis?: PieceBasis;
}

/** Rate key for a wall's structural core (the layer whose material is ""). */
export const CORE_RATE_KEY = "__core__";

/** A zero-cost area rate — the safe default for an unconfigured material. */
export const DEFAULT_RATE: MaterialRate = { unit: "area", rate: 0 };

/** Resolve a layer's rate key: material "" (structural core) → CORE_RATE_KEY. */
export const rateKeyOf = (material: string): string => (material === "" ? CORE_RATE_KEY : material);

/** Seed a rate entry for every catalog material + the structural core. */
export const seedRates = (): Record<string, MaterialRate> => {
  const rates: Record<string, MaterialRate> = { [CORE_RATE_KEY]: { ...DEFAULT_RATE } };
  for (const m of WALL_MATERIALS) rates[m.name] = { ...DEFAULT_RATE };
  return rates;
};
