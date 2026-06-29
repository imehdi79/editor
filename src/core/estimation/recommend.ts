/**
 * recommend — rank candidate assemblies by cost for a given element measure.
 *
 * Decision support for "which assembly?": each candidate is costed at the same
 * quantity through the {@link estimate} pipeline (so rates + flag-driven rules
 * are honoured), then sorted cheapest-first with the all-in delta against a
 * reference — the currently chosen assembly when given, otherwise the cheapest.
 * Pure — no React / store / Konva; reuses the engine, models nothing new.
 */

import { estimate, type ElementMeasure, type PricedLayer, type CostBreakdown } from "./estimate";
import type { Rate } from "./rate";
import type { PricingRule } from "./pricingRule";

/** A candidate assembly to rank (the resolved priced layers + a label). */
export interface AssemblyOption {
  id: string;
  name: string;
  layers: readonly PricedLayer[];
}

/** The pricing context shared by every candidate in a ranking. */
export interface Pricing {
  rates: Record<string, Rate>;
  rules: readonly PricingRule[];
  flags: Iterable<string>;
}

export interface Recommendation {
  id: string;
  name: string;
  /** All-in cost of this assembly at the ranked measure. */
  cost: CostBreakdown;
  /** All-in delta vs the reference (the current option if given, else cheapest). */
  delta: number;
  /** The least-cost option. */
  cheapest: boolean;
  /** The option currently selected (matches `currentId`). */
  current: boolean;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Rank `options` cheapest-first for `measure`; deltas are vs the reference. */
export const recommendAssemblies = (
  options: readonly AssemblyOption[],
  measure: ElementMeasure,
  pricing: Pricing,
  currentId?: string,
): Recommendation[] => {
  if (options.length === 0) return [];
  const flags = [...pricing.flags];
  const costed = options.map((o) => ({
    o,
    est: estimate({ items: [{ name: o.name, layers: o.layers, measure }], rates: pricing.rates, rules: pricing.rules, flags }),
  }));
  costed.sort((a, b) => a.est.total.total - b.est.total.total);

  const minTotal = costed[0].est.total.total;
  const current = costed.find((c) => c.o.id === currentId);
  const refTotal = current ? current.est.total.total : minTotal;

  return costed.map((c) => ({
    id: c.o.id,
    name: c.o.name,
    cost: c.est.total,
    delta: round2(c.est.total.total - refTotal),
    cheapest: c.est.total.total === minTotal,
    current: c.o.id === currentId,
  }));
};
