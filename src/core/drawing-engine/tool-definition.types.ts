import type { GhostShape, Shape } from "./drawing.types";

export interface ToolDefinition {
  minLength?: number;
  buildGhost: (x1: number, y1: number, x2: number, y2: number) => GhostShape;
  buildShape: (x1: number, y1: number, x2: number, y2: number) => Omit<Shape, "id">;
}
