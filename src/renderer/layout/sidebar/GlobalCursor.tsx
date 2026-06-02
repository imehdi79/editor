import { useEffect } from 'react'
import { useToolsStore, TOOL_CURSORS } from '@/store/tools.store'

export default function GlobalCursor() {
  const tool = useToolsStore(s => s.tool)

  useEffect(() => {
    document.body.style.cursor = tool ? TOOL_CURSORS[tool] : 'default'
    return () => { document.body.style.cursor = 'default' }
  }, [tool])

  return null
}