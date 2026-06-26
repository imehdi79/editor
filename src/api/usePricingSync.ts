/**
 * usePricingSync — keeps the per-user pricing settings in step with the backend.
 *
 *   - on auth, load the user's saved settings and hydrate the store;
 *   - thereafter, debounce-save any rate/currency/demolition edit back;
 *   - while the user hasn't picked a currency, follow the active locale's default.
 *
 * Mounted once from Layout (which renders only when authed). UI-only state
 * (showPricingTable) is intentionally not persisted.
 */

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useI18nStore } from "@/store/i18n.store";
import { usePricingStore } from "@/store/pricing.store";
import { pricingApi } from "@/services/pricingApi";

const SAVE_DEBOUNCE_MS = 800;

export const usePricingSync = () => {
  const status = useAuthStore((s) => s.status);
  const locale = useI18nStore((s) => s.locale);

  // Follow the locale's default currency until the user overrides it.
  useEffect(() => {
    usePricingStore.getState().applyLocaleCurrency(locale);
  }, [locale]);

  // Load on auth, then debounce-save subsequent edits.
  useEffect(() => {
    if (status !== "authed") return;

    let active = true;
    const hydrating = { current: true };

    pricingApi
      .get()
      .then((settings) => {
        if (active) usePricingStore.getState().hydrate(settings);
      })
      .catch(() => {
        if (active) usePricingStore.getState().hydrate(null); // offline → keep local defaults
      })
      .finally(() => {
        hydrating.current = false;
      });

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = usePricingStore.subscribe((state, prev) => {
      if (hydrating.current || !state.loaded) return;
      // Persist only when a persistable field actually changed.
      if (
        state.currency === prev.currency &&
        state.demolishRate === prev.demolishRate &&
        state.rates === prev.rates
      ) {
        return;
      }
      if (timer) clearTimeout(timer);
      const payload = usePricingStore.getState().serialize();
      timer = setTimeout(() => {
        void pricingApi.save(payload).catch(() => {
          /* transient failure — next edit retries, settings stay in the store */
        });
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [status]);
};
