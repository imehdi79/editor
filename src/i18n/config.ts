/**
 * i18n config — the supported locales and their presentation metadata.
 *
 * `dir` drives document direction (Persian is RTL); `label` is the native name
 * shown in the language switcher. To add a language: add its code here, add a
 * matching `locales/<code>.ts` dictionary, and register it in `index.ts`.
 */

export const LOCALES = ["en", "it", "de", "fa"] as const;
export type Locale = (typeof LOCALES)[number];

export type TextDirection = "ltr" | "rtl";

export interface LocaleMeta {
  code: Locale;
  /** Native name shown in the language switcher. */
  label: string;
  dir: TextDirection;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { code: "en", label: "English", dir: "ltr" },
  it: { code: "it", label: "Italiano", dir: "ltr" },
  de: { code: "de", label: "Deutsch", dir: "ltr" },
  fa: { code: "fa", label: "فارسی", dir: "rtl" },
};

export const isLocale = (value: string | null | undefined): value is Locale =>
  !!value && (LOCALES as readonly string[]).includes(value);
