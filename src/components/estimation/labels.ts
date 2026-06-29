/**
 * Shared presentation constants for the estimation UI (admin Estimate section +
 * the in-editor estimate panel). Stable enum-id → i18n-key maps plus the field
 * styling and money formatter, kept in one place so both surfaces render the same
 * labels and layout. Uses the design-system tokens (ink/panel/hair/brand) common
 * to the admin console and the editor shell.
 */

import type { TranslationKey } from "@/i18n";
import type { Unit } from "@/core/estimation/units";
import type { ElementType } from "@/core/estimation/elementTypes";
import type { RuleTarget } from "@/core/estimation/pricingRule";

/** Shared field styling for estimation selects/inputs. */
export const FIELD =
  "h-8 rounded-md bg-panel-2 px-2 text-sm text-ink outline-none hair focus-visible:ring-1 focus-visible:ring-brand";

/** Estimate line / total row: name, unit, qty, material, labour, total. */
export const ESTIMATE_ROW = "grid grid-cols-[1fr_3rem_4rem_5rem_5rem_5rem] items-center gap-2 px-3";

/** Two-decimal money/quantity formatter for the estimate readout. */
export const money = (n: number): string => n.toFixed(2);

/** Unit-of-measure ids → i18n label keys. */
export const UNIT_KEY: Record<Unit, TranslationKey> = {
  m2: "units.m2",
  m3: "units.m3",
  ml: "units.ml",
  each: "units.each",
  kg: "units.kg",
};

/** Element-type ids → i18n label keys. */
export const ELEMENT_TYPE_KEY: Record<ElementType, TranslationKey> = {
  wall: "elementTypes.wall",
  floor: "elementTypes.floor",
  ceiling: "elementTypes.ceiling",
  roof: "elementTypes.roof",
};

/** Pricing-rule target ids → i18n label keys. */
export const RULE_TARGET_KEY: Record<RuleTarget, TranslationKey> = {
  material: "ruleTargets.material",
  labor: "ruleTargets.labor",
  total: "ruleTargets.total",
};
