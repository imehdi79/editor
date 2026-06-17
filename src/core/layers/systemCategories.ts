/**
 * System (discipline) categories — the foundation of the layer system.
 *
 * Every shape belongs to one category (Architectural by default). Categories
 * are shown/hidden as a group via the layers store, and are the surface that
 * future discipline tools (electrical, plumbing, roof, …) plug into.
 *
 * Pure data — no React, no store, no Konva.
 */

export type SystemCategory =
  | "architectural"
  | "structural"
  | "electrical"
  | "plumbing"
  | "hvac"
  | "roof"
  | "furniture"
  | "annotation";

export interface SystemCategoryDef {
  id: SystemCategory;
  label: string;
  /** Accent colour for legend chips / UI. */
  color: string;
}

/**
 * Display order follows a typical discipline stack: base structure → building
 * services → finishes → annotation.
 */
export const SYSTEM_CATEGORIES: readonly SystemCategoryDef[] = [
  { id: "architectural", label: "Architectural", color: "#1e293b" },
  { id: "structural", label: "Structural", color: "#78716c" },
  { id: "electrical", label: "Electrical", color: "#f59e0b" },
  { id: "plumbing", label: "Plumbing", color: "#0ea5e9" },
  { id: "hvac", label: "HVAC", color: "#14b8a6" },
  { id: "roof", label: "Roof", color: "#ef4444" },
  { id: "furniture", label: "Furniture", color: "#a855f7" },
  { id: "annotation", label: "Annotation", color: "#64748b" },
];

/** Shapes without an explicit category are Architectural (back-compat). */
export const DEFAULT_CATEGORY: SystemCategory = "architectural";

/** Resolve a shape's category, defaulting absent categories to Architectural. */
export const categoryOf = (shape: { category?: SystemCategory }): SystemCategory =>
  shape.category ?? DEFAULT_CATEGORY;
