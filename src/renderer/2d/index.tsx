import { Stage, Layer } from 'react-konva'
import { useToolsStore } from '@/store/tools.store'
import { useDrawingEngine } from '@/core/drawing-engine/useDrawingEngine'
import { TOOL_REGISTRY } from '@/features/tool-registry'
import ShapeRenderer from './ShapeRenderer'
import GhostRenderer from './GhostRenderer'
import HintsRenderer from './HintsRenderer'
import { useStageSize } from './useStageSize'
import { useStageEvents } from './useStageEvents'

const C2D = () => {
  const tool    = useToolsStore(s => s.tool)
  const toolDef = tool ? TOOL_REGISTRY[tool] ?? null : null
  const { width, height } = useStageSize()

  const { ghost, hints, onMouseDown, onMouseMove, onMouseUp } = useDrawingEngine(toolDef)

  const events = useStageEvents({ onMouseDown, onMouseMove, onMouseUp })

  return (
    <Stage
      width={width}
      height={height}
      style={{ cursor: tool ? 'crosshair' : 'default', touchAction: 'none' }}
      {...events}
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