export const snapToGrid = (
  value: number,
  grid: number
): number => Math.round(value / grid) * grid

export const snapPointToGrid = (
  x: number,
  y: number,
  grid: number
): { x: number; y: number } => ({
  x: snapToGrid(x, grid),
  y: snapToGrid(y, grid),
})