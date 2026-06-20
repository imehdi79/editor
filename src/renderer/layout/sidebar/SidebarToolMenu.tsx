/**
 * SidebarToolMenu — a single icon button that opens a popover of tool options.
 * Used for all toolbar groups except select and pan (which stay as bare buttons).
 * The group icon shows the currently-active tool inside it (if any), otherwise
 * shows the group icon passed as `groupIcon`.
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import SidebarToolButton from "./SidebarToolButton";
import type { SideBarToolsList, Tools } from "./tools.types";
import { useToolsStore } from "@/store/tools.store";

interface Props<T extends Tools> {
  groupIcon: React.ReactNode;
  tools: SideBarToolsList<T>;
  tooltip: string;
}

const SidebarToolMenu = <T extends Tools>({ groupIcon, tools, tooltip }: Props<T>) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTool = useToolsStore((s) => s.tool);

  // Derive the active icon inside this group (if any)
  const toolKeys = Object.keys(tools) as NonNullable<T>[];
  const activeInGroup = toolKeys.find((k) => k === activeTool);
  const displayIcon = activeInGroup ? (tools as SideBarToolsList<T>)[activeInGroup].icon : groupIcon;
  const isGroupActive = !!activeInGroup;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        size="icon"
        variant={isGroupActive ? "default" : "ghost"}
        title={tooltip}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {displayIcon}
      </Button>

      {open && (
        <div className="absolute left-full top-0 ml-2 z-50 bg-popover border shadow-2xl rounded-lg p-1 flex flex-col gap-0.5 min-w-[120px]">
          {toolKeys.map((tool) => {
            const item = (tools as SideBarToolsList<T>)[tool];
            return (
              <div key={String(tool)} onClick={() => setOpen(false)}>
                <SidebarToolButton tool={tool as Tools} icon={item.icon} labelKey={item.labelKey} variant={item.variant} showLabel />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SidebarToolMenu;
