import type { Shape } from "@/core/drawing-engine/drawing.types";
import type { SnapResult } from "@/core/drawing-engine/drawing.types";

// استخراج همه نقاط قابل snap از شکل‌های موجود
const extractSnapPoints = (shapes: Record<string, Shape>) => {
  const points: Array<{ x: number; y: number; type: "node" | "midpoint" }> = [];

  for (const shape of Object.values(shapes)) {
    if (shape.type === "text") {
      points.push({ x: shape.x, y: shape.y, type: "node" });
      continue;
    }

    // endpoint‌ها
    points.push({ x: shape.x1, y: shape.y1, type: "node" });
    points.push({ x: shape.x2, y: shape.y2, type: "node" });

    // midpoint
    points.push({
      x: (shape.x1 + shape.x2) / 2,
      y: (shape.y1 + shape.y2) / 2,
      type: "midpoint",
    });
  }

  return points;
};

// تقاطع دو segment
const segmentIntersection = (
  ax1: number,
  ay1: number,
  ax2: number,
  ay2: number,
  bx1: number,
  by1: number,
  bx2: number,
  by2: number,
): { x: number; y: number } | null => {
  const dax = ax2 - ax1,
    day = ay2 - ay1;
  const dbx = bx2 - bx1,
    dby = by2 - by1;
  const denom = dax * dby - day * dbx;
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((bx1 - ax1) * dby - (by1 - ay1) * dbx) / denom;
  const u = ((bx1 - ax1) * day - (by1 - ay1) * dax) / denom;

  if (t < 0 || t > 1 || u < 0 || u > 1) return null;

  return { x: ax1 + t * dax, y: ay1 + t * day };
};

const extractIntersections = (shapes: Record<string, Shape>) => {
  const segments: Array<[number, number, number, number]> = [];

  for (const shape of Object.values(shapes)) {
    if (shape.type === "text") continue;
    segments.push([shape.x1, shape.y1, shape.x2, shape.y2]);
  }

  const intersections: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const pt = segmentIntersection(...segments[i], ...segments[j]);
      if (pt) intersections.push(pt);
    }
  }

  return intersections;
};

export const snapToPoints = (
  x: number,
  y: number,
  shapes: Record<string, Shape>,
  scale: number = 1,
  snapRadius: number = 12,
): SnapResult => {
  const radius = snapRadius / scale;
  let nearest: SnapResult["snappedTo"] = null;
  let nearestDist = Infinity;
  let nearestType: SnapResult["snapType"] = null;

  // node + midpoint
  for (const pt of extractSnapPoints(shapes)) {
    const dist = Math.hypot(pt.x - x, pt.y - y);
    if (dist < radius && dist < nearestDist) {
      nearestDist = dist;
      nearest = { x: pt.x, y: pt.y };
      nearestType = pt.type;
    }
  }

  // intersections
  for (const pt of extractIntersections(shapes)) {
    const dist = Math.hypot(pt.x - x, pt.y - y);
    if (dist < radius && dist < nearestDist) {
      nearestDist = dist;
      nearest = { x: pt.x, y: pt.y };
      nearestType = "intersection";
    }
  }

  if (nearest) {
    return { x: nearest.x, y: nearest.y, snapped: true, snapType: nearestType, snappedTo: nearest };
  }

  return { x, y, snapped: false, snapType: null, snappedTo: null };
};
