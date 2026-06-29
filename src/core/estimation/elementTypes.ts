/**
 * elementTypes — the kind of building element an assembly (preset) applies to.
 *
 * Scopes an assembly so the estimator only offers wall assemblies for walls,
 * floor assemblies for floors, and so on. Stored as stable string ids; the
 * renderer maps id → localized label via i18n (`elementTypes.*`).
 *
 * Pure data — no React / store / Konva. Part of the (future) estimation domain;
 * nothing in the editor consumes it yet.
 */

export const ELEMENT_TYPES = ["wall", "floor", "ceiling", "roof"] as const;

export type ElementType = (typeof ELEMENT_TYPES)[number];

/** Presets were wall-only until now, so existing data migrates to walls. */
export const DEFAULT_ELEMENT_TYPE: ElementType = "wall";
