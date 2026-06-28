/**
 * theme.store — the active color theme (dark / light).
 *
 * Mehdify is canvas-first and ships dark by default. The choice is persisted to
 * localStorage and mirrored onto `<html class="dark">` so the CAD palette in
 * index.css switches. A tiny inline script in index.html applies the saved
 * theme before first paint (no flash); this store keeps it in sync at runtime.
 */

import { create } from "zustand";

export type Theme = "dark" | "light";

const STORAGE_KEY = "editor.theme";

const detectInitial = (): Theme => {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" ? "light" : "dark";
};

const applyToDocument = (theme: Theme) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
};

const initialTheme = detectInitial();
applyToDocument(initialTheme);

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, theme);
    applyToDocument(theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
}));
