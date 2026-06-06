import { create } from 'zustand'
import type { Shape, ShapeId } from '@/core/drawing-engine/drawing.types'
import { generateId } from '@/lib/generateId'

type ShapesMap = Record<ShapeId, Shape>

interface FloorPlanStore {
  shapes: ShapesMap
  addShape: (shape: Omit<Shape, 'id'>) => void
  removeShape: (id: ShapeId) => void
  reset: () => void
}

export const useFloorPlanStore = create<FloorPlanStore>((set) => ({
  shapes: {},

  addShape: (shape) => {
    const id = generateId(shape.type)
    const full = { ...shape, id } as Shape
    set(s => ({ shapes: { ...s.shapes, [id]: full } }))
  },

  removeShape: (id) =>
    set(s => {
      const { [id]: _, ...rest } = s.shapes
      return { shapes: rest }
    }),

  reset: () => set({ shapes: {} }),
}))