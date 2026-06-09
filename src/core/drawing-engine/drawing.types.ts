import type { DimensionLabel } from "../dimensions/computeDimensions";

export type ShapeId = string;

export interface BaseShape {
  id: ShapeId;
  type: string;
}

export interface WallShape extends BaseShape {
  type: "wall";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
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
 * Same coordinate contract as WindowShape.
 * side = 1 means the swing arc opens to the left of the wall direction;
 * side = -1 means it opens to the right.
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
  /** Which side of the wall the door swings toward (+1 left / -1 right) */
  side: 1 | -1;
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
  snapType: "grid" | "node" | "midpoint" | "intersection" | null;
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
