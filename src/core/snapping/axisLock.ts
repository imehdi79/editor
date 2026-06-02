export interface AxisLockResult {
  x: number;
  y: number;
  locked: boolean;
  axis: "horizontal" | "vertical" | null;
}

export const applyAxisLock = (
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  axisAngleThreshold: number = 5,
): AxisLockResult => {
  const dx = currentX - startX;
  const dy = currentY - startY;
  const dist = Math.hypot(dx, dy);

  if (dist < 4) {
    return { x: currentX, y: currentY, locked: false, axis: null };
  }

  const angleDeg = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));

  // نزدیک به horizontal (0° یا 180°)
  const nearHorizontal = angleDeg < axisAngleThreshold || angleDeg > 180 - axisAngleThreshold;
  // نزدیک به vertical (90°)
  const nearVertical = Math.abs(angleDeg - 90) < axisAngleThreshold;

  if (nearHorizontal) {
    return { x: currentX, y: startY, locked: true, axis: "horizontal" };
  }

  if (nearVertical) {
    return { x: startX, y: currentY, locked: true, axis: "vertical" };
  }

  return { x: currentX, y: currentY, locked: false, axis: null };
};
