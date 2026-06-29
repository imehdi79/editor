/**
 * estimate — the pure cost pipeline that turns an authored catalog + pricing into
 * a costed quote.
 *
 * Given a set of measured elements (each an assembly of priced layers) plus the
 * unit Rates and conditional Rules, it produces a line-item breakdown of
 * material / labour / all-in cost, then applies the rules whose flags are raised
 * to reach a final total. Pure data in, pure data out — no React / store / Konva,
 * so it is unit-testable in isolation and reusable by both the admin preview and
 * (later) the editor.
 *
 * Quantity model: each layer is measured in its own {@link Unit}, derived from
 * the element's geometry — area for m², area×thickness for m³, length for linear
 * metres, count for pieces (kg has no density model yet, so it falls back to the
 * count). Rules apply **additively to the pre-rules base** (not compounding), the
 * simplest defensible model.
 */

import { type Rate, EMPTY_RATE } from "./rate";
import type { Unit } from "./units";
import type { PricingRule, RuleTarget, RuleEffect } from "./pricingRule";

/**
 * A priceable build-up line: a single material at a thickness, measured in a
 * unit. The admin catalog's layers and details structurally satisfy this — the
 * engine never imports the store. When a layer carries `details`, those atomic
 * sub-layers are priced in its place.
 */
export interface PricedLayer {
  /** Label for the costed line (the layer / detail name). */
  name: string;
  /** Material id — looked up in the rate table. */
  materialId: string;
  /** Unit of measure this line is quantified + priced in. */
  unit: Unit;
  /** Build-up thickness in cm (converts area → volume for m³ pricing). */
  thickness: number;
  /** Atomic sub-layers; when present, they are priced in place of this layer. */
  details?: readonly PricedLayer[];
}

/** The measured geometry of one element, from which layer quantities derive. */
export interface ElementMeasure {
  /** Face / surface area in m². */
  area: number;
  /** Running length in m. */
  length: number;
  /** Discrete count (pieces). */
  count: number;
}

/** A zero measure — the starting point for an un-measured element. */
export const EMPTY_MEASURE: ElementMeasure = { area: 0, length: 0, count: 0 };

/** One costed element: a named assembly of priced layers and its measure. */
export interface EstimateItem {
  /** Label for the element (e.g. the preset / assembly name). */
  name: string;
  /** The resolved build-up layers of this element. */
  layers: readonly PricedLayer[];
  /** Measured geometry the layer quantities derive from. */
  measure: ElementMeasure;
}

/** Inputs to a single estimate run. */
export interface EstimateInput {
  /** The elements being costed. */
  items: readonly EstimateItem[];
  /** Unit rate per material id; ids without an entry price at {@link EMPTY_RATE}. */
  rates: Record<string, Rate>;
  /** Conditional modifiers; each fires when its flag is in {@link flags}. */
  rules: readonly PricingRule[];
  /** Flags raised by the chosen question answers. */
  flags: Iterable<string>;
}

/** Material / labour / all-in cost — the common money shape throughout. */
export interface CostBreakdown {
  material: number;
  labor: number;
  total: number;
}

/** A zero cost — the reduce seed and the empty-estimate result. */
export const ZERO_COST: CostBreakdown = { material: 0, labor: 0, total: 0 };

/** One priced line within an element. */
export interface EstimateLine {
  name: string;
  materialId: string;
  unit: Unit;
  /** Quantity in the line's unit (rounded to 2dp). */
  quantity: number;
  /** Unit rate applied. */
  rate: Rate;
  /** Extended cost = quantity × rate. */
  cost: CostBreakdown;
}

/** A costed element: its lines and their subtotal. */
export interface EstimateItemResult {
  name: string;
  lines: EstimateLine[];
  subtotal: CostBreakdown;
}

/** A rule that fired, with the currency delta it contributed. */
export interface AppliedRule {
  name: string;
  flag: string;
  target: RuleTarget;
  effect: RuleEffect;
  amount: number;
  /** Currency delta this rule added to the estimate. */
  delta: number;
}

/** The full result of an estimate run. */
export interface Estimate {
  /** Per-element costed breakdown. */
  items: EstimateItemResult[];
  /** Sum of every element subtotal, before rules. */
  base: CostBreakdown;
  /** Rules that fired, in order. */
  applied: AppliedRule[];
  /** Final cost = base + every applied rule. */
  total: CostBreakdown;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

const roundCost = (c: CostBreakdown): CostBreakdown => ({
  material: round2(c.material),
  labor: round2(c.labor),
  total: round2(c.total),
});

const addCost = (a: CostBreakdown, b: CostBreakdown): CostBreakdown => ({
  material: a.material + b.material,
  labor: a.labor + b.labor,
  total: a.total + b.total,
});

/**
 * Quantity of a layer for an element's measure, per the layer's unit. m³
 * multiplies face area by thickness (cm → m); kg has no density model yet, so it
 * falls back to the discrete count.
 */
export const quantityForUnit = (unit: Unit, thicknessCm: number, m: ElementMeasure): number => {
  switch (unit) {
    case "m2":
      return m.area;
    case "m3":
      return m.area * (thicknessCm / 100);
    case "ml":
      return m.length;
    case "each":
      return m.count;
    case "kg":
      return m.count;
  }
};

/** The lines that price a layer: its details when it has any, else itself. */
const linesOf = (layer: PricedLayer): readonly PricedLayer[] =>
  layer.details && layer.details.length > 0 ? layer.details : [layer];

/** Cost an element's layers into priced lines + their subtotal. */
const costItem = (item: EstimateItem, rates: Record<string, Rate>): EstimateItemResult => {
  const lines: EstimateLine[] = [];
  for (const layer of item.layers) {
    for (const priced of linesOf(layer)) {
      const rate = rates[priced.materialId] ?? EMPTY_RATE;
      const quantity = quantityForUnit(priced.unit, priced.thickness, item.measure);
      const material = round2(rate.material * quantity);
      const labor = round2(rate.labor * quantity);
      lines.push({
        name: priced.name,
        materialId: priced.materialId,
        unit: priced.unit,
        quantity: round2(quantity),
        rate,
        cost: { material, labor, total: round2(material + labor) },
      });
    }
  }
  const subtotal = roundCost(lines.reduce((c, l) => addCost(c, l.cost), ZERO_COST));
  return { name: item.name, lines, subtotal };
};

/** Run the cost pipeline: cost every element, then apply the fired rules. */
export const estimate = (input: EstimateInput): Estimate => {
  const flags = new Set(input.flags);
  const items = input.items.map((item) => costItem(item, input.rates));
  const base = roundCost(items.reduce((c, r) => addCost(c, r.subtotal), ZERO_COST));

  // Each fired rule is measured against the pre-rules base (additive, not
  // compounding); deltas accumulate per target so material/labour stay split.
  const applied: AppliedRule[] = [];
  let extraMaterial = 0;
  let extraLabor = 0;
  let extraTotal = 0;
  for (const rule of input.rules) {
    if (!rule.flag || !flags.has(rule.flag)) continue;
    const targetValue = rule.target === "material" ? base.material : rule.target === "labor" ? base.labor : base.total;
    const delta = round2(rule.effect === "percent" ? (targetValue * rule.amount) / 100 : rule.amount);
    if (delta === 0) continue;
    if (rule.target === "material") extraMaterial += delta;
    else if (rule.target === "labor") extraLabor += delta;
    else extraTotal += delta;
    applied.push({
      name: rule.name,
      flag: rule.flag,
      target: rule.target,
      effect: rule.effect,
      amount: rule.amount,
      delta,
    });
  }

  const material = round2(base.material + extraMaterial);
  const labor = round2(base.labor + extraLabor);
  const total = round2(material + labor + extraTotal);
  return { items, base, applied, total: { material, labor, total } };
};
