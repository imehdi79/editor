/**
 * pricingRule — value types for a conditional price modifier.
 *
 * A rule fires when a flag (raised by a question answer) is present, then
 * adjusts a cost target by an effect: a percentage of, or a fixed amount added
 * to, the material / labour / all-in cost. Stable string ids; labels are
 * localized by the renderer (`ruleTargets.*`, `ruleEffects.*`).
 *
 * Pure data — no React / store / Konva. Seeds the estimation domain; nothing
 * consumes it yet.
 */

/** What part of a cost a rule adjusts. */
export const RULE_TARGETS = ["material", "labor", "total"] as const;
export type RuleTarget = (typeof RULE_TARGETS)[number];

/** How a rule adjusts its target. */
export const RULE_EFFECTS = ["percent", "fixed"] as const;
export type RuleEffect = (typeof RULE_EFFECTS)[number];

export const DEFAULT_RULE_TARGET: RuleTarget = "total";
export const DEFAULT_RULE_EFFECT: RuleEffect = "percent";

/**
 * The pure firing contract of a pricing rule — the fields the estimator needs to
 * decide whether a rule applies and by how much. The admin store extends this
 * with its own `id`; everything authored here is plain user data (a free-text
 * `name`, a flag id), never an i18n key, so it lives safely in core.
 */
export interface PricingRule {
  /** Human label, e.g. "Difficult access surcharge". */
  name: string;
  /** Flag that triggers the rule (matches a question answer's flag); "" = never fires. */
  flag: string;
  /** Cost target the rule adjusts. */
  target: RuleTarget;
  /** How the adjustment is applied. */
  effect: RuleEffect;
  /** A percentage when effect = "percent", else a fixed cost added once. */
  amount: number;
}
