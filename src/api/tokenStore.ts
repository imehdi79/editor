/**
 * tokenStore — production-ready JWT storage for the SPA.
 *
 * The backend returns the JWT in the response body and expects it back as
 * `Authorization: Bearer <token>`, so the token must live client-side. We use
 * `localStorage` (persists across reloads/tabs) fronted by an in-memory cache,
 * plus a pub/sub so the app reacts to changes, and a `storage` listener so a
 * login/logout in one tab propagates to every other tab.
 *
 * Security note: localStorage is the pragmatic standard for SPA bearer tokens
 * but is readable by injected scripts (XSS). The only strictly safer option is
 * an httpOnly cookie set by the server — that requires backend cookie support
 * and is intentionally out of scope here.
 */

const STORAGE_KEY = "construct.token";

type Listener = (token: string | null) => void;

let cached: string | null = null;
let initialized = false;
const listeners = new Set<Listener>();

const readRaw = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const ensure = () => {
  if (!initialized) {
    cached = readRaw();
    initialized = true;
  }
};

const emit = () => {
  for (const l of listeners) l(cached);
};

export const getToken = (): string | null => {
  ensure();
  return cached;
};

export const setToken = (token: string): void => {
  ensure();
  cached = token;
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* storage unavailable (private mode / quota) — keep the in-memory copy */
  }
  emit();
};

export const clearToken = (): void => {
  ensure();
  cached = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  emit();
};

/** Subscribe to token changes (login, logout, 401-clear, cross-tab). */
export const subscribeToken = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Cross-tab sync: another tab changed the token → mirror it here and notify.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    cached = e.newValue;
    initialized = true;
    emit();
  });
}
