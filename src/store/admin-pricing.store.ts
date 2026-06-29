/**
 * admin-pricing.store — the Pricing context: per-material unit Rates (material +
 * labour cost, keyed by material id) plus the conditional Rules that adjust a
 * cost when a question flag is raised.
 *
 * Rates *reference* the materials catalog rather than duplicating it: a Rate is
 * read by `materialId`, defaulting to {@link EMPTY_RATE} when none is set, so
 * adding/removing a material never leaves pricing inconsistent (an orphaned rate
 * is simply never read). Rules reference question flags by their string id.
 * Persists to localStorage; not consumed by the editor yet — this is staging for
 * a future estimation engine.
 */

import { create } from "zustand";
import { uid } from "@/lib/uid";
import { type Rate, EMPTY_RATE } from "@/core/estimation/rate";
import {
  type RuleTarget,
  type RuleEffect,
  DEFAULT_RULE_TARGET,
  DEFAULT_RULE_EFFECT,
} from "@/core/estimation/pricingRule";

/** A conditional price modifier triggered by a question flag. */
export interface AdminPricingRule {
  id: string;
  /** Human label, e.g. "Difficult access surcharge". */
  name: string;
  /** Flag that triggers the rule (matches a question answer's flag); "" = none. */
  flag: string;
  /** Cost target the rule adjusts. */
  target: RuleTarget;
  /** How the adjustment is applied. */
  effect: RuleEffect;
  /** Amount: a percentage when effect = "percent", else a fixed cost. */
  amount: number;
}

const RATES_KEY = "mehdify.admin.rates.v1";
const RULES_KEY = "mehdify.admin.pricing-rules.v1";

const loadRates = (): Record<string, Rate> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Rate>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const loadRules = (): AdminPricingRule[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AdminPricingRule[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r) => ({
      id: r.id,
      name: r.name,
      flag: r.flag ?? "",
      target: r.target ?? DEFAULT_RULE_TARGET,
      effect: r.effect ?? DEFAULT_RULE_EFFECT,
      amount: r.amount ?? 0,
    }));
  } catch {
    return [];
  }
};

const write = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — keep the in-memory copy */
  }
};

interface AdminPricingStore {
  /** Unit rate per material id; ids without an entry price at EMPTY_RATE. */
  rates: Record<string, Rate>;
  /** Conditional modifiers applied when a question flag is raised. */
  rules: AdminPricingRule[];
  /** Patch a material's rate (material and/or labour cost). */
  setRate: (materialId: string, patch: Partial<Rate>) => void;
  /** Append a fresh, empty rule. */
  addRule: () => void;
  updateRule: (id: string, patch: Partial<Omit<AdminPricingRule, "id">>) => void;
  removeRule: (id: string) => void;
}

export const useAdminPricingStore = create<AdminPricingStore>((set, get) => {
  const commitRules = (rules: AdminPricingRule[]) => {
    write(RULES_KEY, rules);
    set({ rules });
  };

  return {
    rates: loadRates(),
    rules: loadRules(),

    setRate: (materialId, patch) => {
      const rates = { ...get().rates, [materialId]: { ...(get().rates[materialId] ?? EMPTY_RATE), ...patch } };
      write(RATES_KEY, rates);
      set({ rates });
    },

    addRule: () =>
      commitRules([
        ...get().rules,
        { id: uid(), name: "", flag: "", target: DEFAULT_RULE_TARGET, effect: DEFAULT_RULE_EFFECT, amount: 0 },
      ]),
    updateRule: (id, patch) => commitRules(get().rules.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    removeRule: (id) => commitRules(get().rules.filter((r) => r.id !== id)),
  };
});
