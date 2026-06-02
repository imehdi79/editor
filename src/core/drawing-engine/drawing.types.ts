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

export type Shape = WallShape | LineShape | DashedLineShape | TextShape;

// Ghost — همون شکل در حین رسم، بدون id
export type GhostShape =
  | Omit<WallShape, "id">
  | Omit<LineShape, "id">
  | Omit<DashedLineShape, "id">
  | Omit<TextShape, "id">
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
