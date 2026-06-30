import type { GhostShape, Shape } from "./drawing.types";

export interface ToolDefinition {
  minLength?: number;
  /**
   * When true, the tool supports continuous (chain) drawing: after a segment is
   * committed the endpoint becomes the next segment's start, so connected runs
   * are drawn without re-acquiring the previous node. Only honoured while the
   * editor's `chainDrawing` setting is on (see useDrawingEngine). Segment tools
   * (wall, arc-wall, line, dashed-line) opt in; placement/point tools do not.
   */
  chainable?: boolean;
  buildGhost: (x1: number, y1: number, x2: number, y2: number) => GhostShape;
  buildShape: (x1: number, y1: number, x2: number, y2: number) => Omit<Shape, "id">;
}
