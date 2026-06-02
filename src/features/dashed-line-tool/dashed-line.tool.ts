import type { ToolDefinition } from '@/core/drawing-engine/tool-definition.types'

export const dashedLineToolDefinition: ToolDefinition = {
  minLength: 5,

  buildGhost: (x1, y1, x2, y2) => ({
    type: 'dashed-line', x1, y1, x2, y2,
  }),

  buildShape: (x1, y1, x2, y2) => ({
    type: 'dashed-line', x1, y1, x2, y2,
  }),
}