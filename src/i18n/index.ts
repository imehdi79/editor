/**
 * i18n core — the `useTranslation` hook plus the dot-path key machinery.
 *
 * Translation is a tiny, dependency-free lookup: dictionaries are plain nested
 * objects (one per locale, all sharing the `Dictionary` shape), and a key like
 * `"settings.wallJoin"` walks that object. `{placeholders}` are filled from the
 * optional params. The active locale lives in `i18n.store`.
 *
 *   const { t, tf, dir } = useTranslation();
 *   t("settings.title")                  // typed key, autocompleted
 *   t("wall.alignDoors", { count: 3 })   // with interpolation
 *   tf(`materials.${name}`, name)        // dynamic key, falls back if missing
 */

import { useI18nStore } from "@/store/i18n.store";
import { LOCALE_META, type Locale, type TextDirection } from "./config";
import { en } from "./locales/en";
import { it } from "./locales/it";
import { de } from "./locales/de";
import { fa } from "./locales/fa";

/** The authoritative dictionary shape — every locale must match `en`. */
export type Dictionary = typeof en;

export const DICTIONARIES: Record<Locale, Dictionary> = { en, it, de, fa };

/** Every leaf path through `T` as a dotted string, e.g. `"settings.title"`. */
export type DotPath<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPath<T[K]>}`;
}[keyof T & string];

export type TranslationKey = DotPath<Dictionary>;

type Params = Record<string, string | number>;

/** Walk a dictionary by dotted key. Returns `null` when the path misses. */
const lookup = (dict: Dictionary, key: string): string | null => {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in cur) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  return typeof cur === "string" ? cur : null;
};

const interpolate = (template: string, params?: Params): string =>
  params
    ? template.replace(/\{(\w+)\}/g, (m, name: string) =>
        name in params ? String(params[name]) : m,
      )
    : template;

export interface Translator {
  /** Translate a typed key (autocompleted), filling any `{placeholders}`. */
  t: (key: TranslationKey, params?: Params) => string;
  /**
   * Translate a dynamic key not known at compile time (material/template ids,
   * etc.), returning `fallback` when the key is absent in the active locale.
   */
  tf: (key: string, fallback: string, params?: Params) => string;
  locale: Locale;
  dir: TextDirection;
}

export const useTranslation = (): Translator => {
  const locale = useI18nStore((s) => s.locale);
  const dict = DICTIONARIES[locale];

  const t = (key: TranslationKey, params?: Params): string =>
    interpolate(lookup(dict, key) ?? key, params);

  const tf = (key: string, fallback: string, params?: Params): string => {
    const hit = lookup(dict, key);
    return interpolate(hit ?? fallback, params);
  };

  return { t, tf, locale, dir: LOCALE_META[locale].dir };
};
