import type { ToolDefinition } from '@/core/drawing-engine/tool-definition.types'

export const wallToolDefinition: ToolDefinition = {
  minLength: 10,

  buildGhost: (x1, y1, x2, y2) => ({
    type: 'wall', x1, y1, x2, y2, thickness: 12,
  }),

  buildShape: (x1, y1, x2, y2) => ({
    type: 'wall', x1, y1, x2, y2, thickness: 12,
  }),
}