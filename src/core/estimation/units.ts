/**
 * units — units of measure, the linchpin of the (future) estimation layer.
 *
 * Every priceable thing (today a material; later a labour rate) is quantified in
 * one of these, so a cost can be computed as `quantity × rate`. Stored as stable
 * string ids; the renderer maps id → localized label via i18n (`units.*`).
 *
 * Pure data — no React / store / Konva. Seeds the estimation domain; nothing in
 * the editor consumes it yet.
 */

export const UNITS = ["m2", "m3", "ml", "each", "kg"] as const;

export type Unit = (typeof UNITS)[number];

/** Area is the most common build-up measure, so it's the default + migration fallback. */
export const DEFAULT_UNIT: Unit = "m2";
