import { create } from "zustand";
import { type MaterialRate, DEFAULT_RATE, seedRates } from "@/core/pricing/pricingRates";
import { LOCALE_CURRENCY, type Locale } from "@/i18n/config";
import { useI18nStore } from "@/store/i18n.store";

/** The persistable slice of pricing settings (what the backend stores per user). */
export interface PricingSettings {
  currency: string;
  demolishRate: number;
  rates: Record<string, MaterialRate>;
}

/** Default currency for the currently active locale (the unconfigured default). */
const localeCurrency = (locale: Locale = useI18nStore.getState().locale): string =>
  LOCALE_CURRENCY[locale];

interface PricingStore {
  /** Currency label shown next to amounts (free text, e.g. "تومان", "€"). */
  currency: string;
  /** Per-material billing rules, keyed by material name (CORE_RATE_KEY = core). */
  rates: Record<string, MaterialRate>;
  /** Demolition rate — currency per m² of an existing wall's surface. */
  demolishRate: number;
  /** Whether the on-canvas pricing table is drawn (UI-only, not persisted). */
  showPricingTable: boolean;
  /** The user set the currency explicitly → stop tracking the locale default. */
  currencyTouched: boolean;
  /** Settings have been hydrated from (or confirmed absent on) the backend. */
  loaded: boolean;

  setCurrency: (currency: string) => void;
  setRate: (material: string, patch: Partial<MaterialRate>) => void;
  setDemolishRate: (rate: number) => void;
  setShowPricingTable: (show: boolean) => void;

  /** Load saved settings from the backend (null = none saved yet). */
  hydrate: (settings: PricingSettings | null) => void;
  /** Re-seed the locale's default currency while the user hasn't overridden it. */
  applyLocaleCurrency: (locale: Locale) => void;
  /** The persistable slice (sent to the backend on save). */
  serialize: () => PricingSettings;
  /** Reset to defaults (on logout, so one user's rates never bleed to the next). */
  reset: () => void;
}

export const usePricingStore = create<PricingStore>((set, get) => ({
  currency: localeCurrency(),
  rates: seedRates(),
  demolishRate: 0,
  showPricingTable: false,
  currencyTouched: false,
  loaded: false,

  setCurrency: (currency) => set({ currency, currencyTouched: true }),
  setRate: (material, patch) =>
    set((s) => ({
      rates: {
        ...s.rates,
        [material]: { ...(s.rates[material] ?? DEFAULT_RATE), ...patch },
      },
    })),
  setDemolishRate: (demolishRate) => set({ demolishRate }),
  setShowPricingTable: (showPricingTable) => set({ showPricingTable }),

  hydrate: (settings) => {
    if (!settings) {
      set({ loaded: true });
      return;
    }
    // Merge saved rates over the seeded catalog so a newly added material still
    // has a default entry, while saved rules win.
    set({
      currency: settings.currency,
      demolishRate: settings.demolishRate,
      rates: { ...seedRates(), ...settings.rates },
      currencyTouched: true, // a saved currency is the user's choice
      loaded: true,
    });
  },

  applyLocaleCurrency: (locale) => {
    if (get().currencyTouched) return;
    set({ currency: LOCALE_CURRENCY[locale] });
  },

  serialize: () => {
    const { currency, demolishRate, rates } = get();
    return { currency, demolishRate, rates };
  },

  reset: () =>
    set({
      currency: localeCurrency(),
      rates: seedRates(),
      demolishRate: 0,
      currencyTouched: false,
      loaded: false,
    }),
}));
