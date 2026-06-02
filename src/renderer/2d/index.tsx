import { Stage, Layer } from 'react-konva'
import { useToolsStore } from '@/store/tools.store'
import { useDrawingEngine } from '@/core/drawing-engine/useDrawingEngine'
import { TOOL_REGISTRY } from '@/features/tool-registry'
import ShapeRenderer from './ShapeRenderer'
import GhostRenderer from './GhostRenderer'
import HintsRenderer from './HintsRenderer'

const C2D = () => {
  const tool    = useToolsStore(s => s.tool)
  const toolDef = tool ? TOOL_REGISTRY[tool] ?? null : null

  const { ghost, hints, onMouseDown, onMouseMove, onMouseUp } = useDrawingEngine(toolDef)

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      style={{ cursor: tool ? 'crosshair' : 'default' }}
      onMouseDown={e => {
        const pos = e.target.getStage()?.getPointerPosition()
        if (pos) onMouseDown(pos.x, pos.y)
      }}
      onMouseMove={e => {
        const pos = e.target.getStage()?.getPointerPosition()
        if (pos) onMouseMove(pos.x, pos.y)
      }}
      onMouseUp={e => {
        const pos = e.target.getStage()?.getPointerPosition()
        if (pos) onMouseUp(pos.x, pos.y)
      }}
    >
      <Layer>
        <ShapeRenderer />
        <GhostRenderer ghost={ghost} />
        <HintsRenderer hints={hints} />
      </Layer>
    </Stage>
  )
}

export default C2D