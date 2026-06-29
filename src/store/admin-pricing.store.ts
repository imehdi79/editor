/**
 * admin-pricing.store — per-material unit Rates (material + labour cost), keyed
 * by material id.
 *
 * The Pricing context *references* the materials catalog rather than duplicating
 * it: a Rate is read by `materialId`, defaulting to {@link EMPTY_RATE} when none
 * is set, so adding/removing a material never leaves pricing inconsistent (an
 * orphaned rate is simply never read). Persists to localStorage; not consumed by
 * the editor yet — this is staging for a future estimation engine.
 */

import { create } from "zustand";
import { type Rate, EMPTY_RATE } from "@/core/estimation/rate";

const RATES_KEY = "mehdify.admin.rates.v1";

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

const persist = (rates: Record<string, Rate>) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RATES_KEY, JSON.stringify(rates));
  } catch {
    /* quota / private mode — keep the in-memory copy */
  }
};

interface AdminPricingStore {
  /** Unit rate per material id; ids without an entry price at EMPTY_RATE. */
  rates: Record<string, Rate>;
  /** Patch a material's rate (material and/or labour cost). */
  setRate: (materialId: string, patch: Partial<Rate>) => void;
}

export const useAdminPricingStore = create<AdminPricingStore>((set, get) => ({
  rates: loadRates(),
  setRate: (materialId, patch) => {
    const rates = { ...get().rates, [materialId]: { ...(get().rates[materialId] ?? EMPTY_RATE), ...patch } };
    persist(rates);
    set({ rates });
  },
}));
