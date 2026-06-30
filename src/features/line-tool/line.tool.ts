import type { ToolDefinition } from '@/core/drawing-engine/tool-definition.types'

export const lineToolDefinition: ToolDefinition = {
  minLength: 5,
  chainable: true,

  buildGhost: (x1, y1, x2, y2) => ({
    type: 'line', x1, y1, x2, y2,
  }),

  buildShape: (x1, y1, x2, y2) => ({
    type: 'line', x1, y1, x2, y2,
  }),
}