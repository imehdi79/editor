/**
 * i18n.store — the active UI locale.
 *
 * The choice is persisted to localStorage and, on every change, mirrored onto
 * `<html lang dir>` so Persian renders right-to-left. Initial locale: a saved
 * choice, else the browser language if supported, else English. Applying the
 * document attributes at module load avoids a first-paint LTR flash.
 */

import { create } from "zustand";
import { LOCALE_META, isLocale, type Locale } from "@/i18n/config";

const STORAGE_KEY = "editor.locale";

const detectInitial = (): Locale => {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (isLocale(saved)) return saved;
  const nav = navigator.language?.slice(0, 2).toLowerCase();
  return isLocale(nav) ? nav : "en";
};

const applyToDocument = (locale: Locale) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.lang = locale;
  root.dir = LOCALE_META[locale].dir;
};

const initialLocale = detectInitial();
applyToDocument(initialLocale);

interface I18nStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useI18nStore = create<I18nStore>((set) => ({
  locale: initialLocale,
  setLocale: (locale) => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, locale);
    applyToDocument(locale);
    set({ locale });
  },
}));
