import { useToolsStore } from '@/store/tools.store'
import type { SideBarToolsListItem, Tools } from './tools.types'
import { Button } from '@/components/ui/button'

const SidebarToolButton = ({ icon, label, tool }: { tool: Tools } & SideBarToolsListItem) => {
  const activeTool = useToolsStore(s => s.tool)
  const setTool    = useToolsStore(s => s.setTool)

  return (
    <Button
      onClick={() => setTool(tool)}
      title={label}
      variant={activeTool === tool ? 'default' : 'ghost'}
      size="icon"
    >
      {icon}
    </Button>
  )
}

export default SidebarToolButton