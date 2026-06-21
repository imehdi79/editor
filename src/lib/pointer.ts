/**
 * Pointer-capability helper. A "coarse" pointer (finger / pen) needs larger
 * hit targets than a fine pointer (mouse). Read once at module load — the same
 * approach editor.store uses for `snapRadius`. A hybrid device that swaps input
 * mid-session keeps the touch-sized targets, which is the safe default.
 */
export const isCoarsePointer = (): boolean =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

/** Cached value — evaluated once so callers don't re-query matchMedia per frame. */
export const COARSE_POINTER = isCoarsePointer();
