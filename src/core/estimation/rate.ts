/**
 * rate — the cost of one unit of a priced item, split into the material spend
 * and the labour to install it. Both are per the item's Unit; the all-in unit
 * cost is their sum.
 *
 * Kept separate from the catalog (a Rate is looked up by what it prices, not
 * embedded in it) so pricing can evolve — modifiers, regional rates, AI-authored
 * formulas — without touching the geometry model. Pure data: no React / store /
 * Konva. Seeds the estimation domain; nothing in the editor consumes it yet.
 */

export interface Rate {
  /** Material cost per unit. */
  material: number;
  /** Labour cost per unit. */
  labor: number;
}

/** A zero rate — the fallback for an item that hasn't been priced yet. */
export const EMPTY_RATE: Rate = { material: 0, labor: 0 };

/** All-in cost of one unit = material + labour. */
export const unitCost = (rate: Rate): number => rate.material + rate.labor;
