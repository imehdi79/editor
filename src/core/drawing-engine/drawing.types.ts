import type { DimensionLabel } from "../dimensions/computeDimensions";

export type ShapeId = string;

export interface BaseShape {
  id: ShapeId;
  type: string;
}

/** The two faces of a wall. Geometry-agnostic labels — layers are never drawn,
 *  so which face is which is purely a construction/takeoff bookkeeping concern. */
export type WallSide = "inner" | "outer";

/**
 * WallLayer — a single construction layer on one face of a wall (e.g. brick,
 * plaster). Purely a takeoff/specification concern: layers carry no canvas
 * geometry and are never drawn or dimensioned in 2D. `thickness` is the layer's
 * own build-up thickness in px, independent of the wall's structural thickness.
 */
export interface WallLayer {
  id: string;
  /** Construction material / name, e.g. "Brick", "Plaster". */
  material: string;
  /** Layer build-up thickness in px. */
  thickness: number;
}

export interface WallShape extends BaseShape {
  type: "wall";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  /** Wall height in real units. Not drawn in 2D; used for future
   *  surface/volume (area) calculations. Optional for back-compat. */
  height?: number;
  /**
   * Per-side construction layers (brick, plaster, ...). Each wall face carries
   * an independent stack. Optional for back-compat; absent = no layers defined.
   */
  layers?: Record<WallSide, WallLayer[]>;
}

export interface LineShape extends BaseShape {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DashedLineShape extends BaseShape {
  type: "dashed-line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TextShape extends BaseShape {
  type: "text";
  x: number;
  y: number;
  content: string;
}

/**
 * WindowShape — a window opening cut into a wall.
 *
 * Geometry is stored in absolute canvas coordinates (x1/y1 → x2/y2)
 * so that rendering, hit-testing, selection, and transform engines can
 * treat it identically to other segment shapes.
 *
 * wallId tracks which wall it was placed on so that the opening remains
 * logically associated with its host wall (used for future constraint
 * re-projection when the wall is moved/resized).
 */
export interface WindowShape extends BaseShape {
  type: "window";
  /** Start point of the window opening in canvas space */
  x1: number;
  y1: number;
  /** End point of the window opening in canvas space */
  x2: number;
  y2: number;
  /** Width of the opening along the wall (mirrors |x2-x1| projected onto wall) */
  width: number;
  /** Thickness inherited from the host wall for correct visual rendering */
  thickness: number;
  /** ID of the wall this window is attached to (null if freestanding) */
  wallId: ShapeId | null;
}

/**
 * DoorShape — a door opening cut into a wall with a swing arc.
 *
 * Two independent properties define all four valid door configurations:
 *
 *   hingeSide      — which end of the opening is hinged.
 *                    "left"  → hinge at x1/y1 (wall start direction)
 *                    "right" → hinge at x2/y2 (wall end direction)
 *
 *   swingDirection — which side of the wall the door opens toward,
 *                    relative to the wall's left-hand normal.
 *                    "inward"  → toward wall normal
 *                    "outward" → away from wall normal
 *
 * Use computeDoorSwing() to derive all rendering geometry from these fields.
 */
export interface DoorShape extends BaseShape {
  type: "door";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  thickness: number;
  wallId: ShapeId | null;
  hingeSide: "left" | "right";
  swingDirection: "inward" | "outward";
}

export type Shape = WallShape | LineShape | DashedLineShape | TextShape | WindowShape | DoorShape;

// Ghost — همون شکل در حین رسم، بدون id
export type GhostShape =
  | Omit<WallShape, "id">
  | Omit<LineShape, "id">
  | Omit<DashedLineShape, "id">
  | Omit<TextShape, "id">
  | Omit<WindowShape, "id">
  | Omit<DoorShape, "id">
  | null;

export interface SnapResult {
  x: number;
  y: number;
  snapped: boolean;
  snapType: "grid" | "node" | "midpoint" | "intersection" | "edge" | null;
  snappedTo: { x: number; y: number } | null; // نقطه‌ای که snap شدیم بهش
}

export interface GuideLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  axis: "horizontal" | "vertical";
}

export interface DrawingHints {
  snapResult: SnapResult | null;
  guides: GuideLine[];
  axisLocked: boolean;
  axisLockAngle: "horizontal" | "vertical" | null;
}

export interface DrawingHints {
  snapResult: SnapResult | null;
  guides: GuideLine[];
  axisLocked: boolean;
  axisLockAngle: "horizontal" | "vertical" | null;
  perpLocked: boolean; // ← جدید
  dimension: DimensionLabel | null; // ← جدید
}
