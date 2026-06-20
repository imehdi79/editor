/**
 * junctionConfig — default user choices for wall junctions.
 *
 * This is the single source of truth for the junction defaults; editor.store
 * seeds its initial state from it, and geometry builders fall back to it when no
 * config is supplied. Keeping it here (framework-free) lets pure unit tests build
 * outlines without spinning up the store.
 */

import type { JunctionConfig } from "./junction.types";

export const DEFAULT_JUNCTION_CONFIG: JunctionConfig = {
  /** Mitred corners are the architectural default. */
  joinStyle: "miter",
  /** Canvas/SVG-style ratio: above this the mitre spike is cut to a bevel. */
  miterLimit: 4,
  /** Flat (flush) free ends. */
  endCap: "butt",
  /** Centred join when two walls differ in thickness. */
  align: "centered",
};
