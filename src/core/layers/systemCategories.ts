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

/** Base category for shapes without an explicit one. */
export const DEFAULT_CATEGORY: SystemCategory = "architectural";

/**
 * Default category for a shape kind: text is Annotation, the structural /
 * opening / line shapes are Architectural. Discipline tools (electrical, …)
 * set their shape's category explicitly instead of relying on this.
 */
export const categoryForType = (type: string): SystemCategory =>
  type === "text" ? "annotation" : DEFAULT_CATEGORY;

/**
 * Resolve a shape's category: its explicit `category`, else the default for its
 * type. So existing (unstamped) text still resolves to Annotation, etc.
 */
export const categoryOf = (shape: { type: string; category?: SystemCategory }): SystemCategory =>
  shape.category ?? categoryForType(shape.type);
