/**
 * uid — a globally-unique id for persisted entities (projects, pages).
 *
 * Unlike generateId's per-session counter (which resets to 1 on every reload and
 * would collide with already-persisted ids), this is unique across sessions and
 * clients — safe to use as a backend primary key.
 */
export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
