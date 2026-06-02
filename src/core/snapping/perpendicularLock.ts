// وقتی داریم خط جدید میکشیم و زاویه‌اش نزدیک ۹۰ درجه با
// یه خط موجود بود، lock کن — دقیقاً مثل axis lock ولی نسبت به shape

import type { Shape } from "@/core/drawing-engine/drawing.types";

const PERP_THRESHOLD = 8; // degrees

interface PerpResult {
  x: number;
  y: number;
  locked: boolean;
  sourceShapeId: string | null;
}

// زاویه یه segment به رادیان
const segmentAngle = (x1: number, y1: number, x2: number, y2: number) => Math.atan2(y2 - y1, x2 - x1);

// نزدیک‌ترین نقطه روی segment به یه نقطه خارجی
const closestPointOnSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax,
    dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: ax, y: ay };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return { x: ax + t * dx, y: ay + t * dy };
};

export const applyPerpendicularLock = (
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  shapes: Record<string, Shape>,
  threshold = PERP_THRESHOLD,
): PerpResult => {
  const currentAngle = Math.atan2(currentY - startY, currentX - startX);

  for (const shape of Object.values(shapes)) {
    if (shape.type === "text") continue;

    const shapeAngle = segmentAngle(shape.x1, shape.y1, shape.x2, shape.y2);

    // زاویه عمود = زاویه shape + 90 درجه
    const perpAngle = shapeAngle + Math.PI / 2;

    // فاصله زاویه‌ای (normalized)
    const diff = Math.abs(((currentAngle - perpAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * (180 / Math.PI);

    if (diff < threshold) {
      // lock کن — cursor رو روی خط عمود از start نگه دار
      const dist = Math.hypot(currentX - startX, currentY - startY);
      const lockedX = startX + Math.cos(perpAngle) * dist;
      const lockedY = startY + Math.sin(perpAngle) * dist;

      return { x: lockedX, y: lockedY, locked: true, sourceShapeId: shape.id };
    }
  }

  return { x: currentX, y: currentY, locked: false, sourceShapeId: null };
};
