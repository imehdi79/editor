/**
 * MobileToolbar — a single floating action button (bottom-right) that opens a
 * bottom sheet of all tools. Replaces the old left sidebar with a thumb-reachable,
 * touch-sized control surface:
 *   - every target is ≥44px (Apple HIG) — tools are large tiles, not 32px icons;
 *   - one tap per tool (no nested fly-out menus);
 *   - the FAB shows the active tool's icon so the current mode is always visible.
 *
 * Systems (layers) and Settings open as centered modals rendered as siblings of
 * the sheet, so closing the sheet doesn't unmount them.
 */

import { useState } from "react";
import {
  Type,
  BrickWallIcon,
  Spline,
  Ellipsis,
  Minus,
  SplinePointer,
  Redo,
  Undo,
  Trash2,
  DoorOpen,
  AppWindowMac,
  Layers3,
  Settings2,
  PencilRuler,
  type LucideIcon,
} from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useToolsStore } from "@/store/tools.store";
import { useTemporalStore, useFloorPlanStore } from "@/store/floor-plan.store";
import { useSelectionStore } from "@/store/selection.store";
import { useTranslation, type TranslationKey } from "@/i18n";
import type { NoOneClickTools } from "./sidebar/tools.types";
import SystemsPanel from "./sidebar/SystemsPanel";
import SettingsPanel from "./sidebar/SettingsPanel";

/** Mode tools — selecting one sets the active tool and closes the sheet. */
const MODE_TOOLS: { tool: NoOneClickTools; Icon: LucideIcon; labelKey: TranslationKey }[] = [
  { tool: "select", Icon: SplinePointer, labelKey: "tools.select" },
  { tool: "wall", Icon: BrickWallIcon, labelKey: "tools.wall" },
  { tool: "arc-wall", Icon: Spline, labelKey: "tools.arcWall" },
  { tool: "window", Icon: AppWindowMac, labelKey: "tools.window" },
  { tool: "door", Icon: DoorOpen, labelKey: "tools.door" },
  { tool: "line", Icon: Minus, labelKey: "tools.line" },
  { tool: "dashed-line", Icon: Ellipsis, labelKey: "tools.dashedLine" },
  { tool: "text", Icon: Type, labelKey: "tools.text" },
];

const MobileToolbar = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<null | "systems" | "settings">(null);

  const activeTool = useToolsStore((s) => s.tool);
  const setTool = useToolsStore((s) => s.setTool);

  const undo = useTemporalStore((s) => s.undo);
  const redo = useTemporalStore((s) => s.redo);
  const canUndo = useTemporalStore((s) => s.pastStates.length > 0);
  const canRedo = useTemporalStore((s) => s.futureStates.length > 0);

  const selectedId = useSelectionStore((s) => s.selectedId);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const removeShape = useFloorPlanStore((s) => s.removeShape);

  const pickTool = (tool: NoOneClickTools) => {
    setTool(tool);
    setOpen(false);
  };

  const onDelete = () => {
    if (!selectedId) return;
    removeShape(selectedId);
    clearSelection();
    setOpen(false);
  };

  // FAB shows the active tool's icon (or a generic toolbox icon when idle).
  const FabIcon = MODE_TOOLS.find((m) => m.tool === activeTool)?.Icon ?? PencilRuler;

  return (
    <>
      {/* Floating action button — bottom-right, always visible */}
      <Button
        variant="default"
        title={t("tools.title")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 size-14 rounded-full shadow-2xl"
      >
        <FabIcon className="size-6" />
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>{t("tools.title")}</DrawerTitle>
          </DrawerHeader>

          <div className="flex flex-col gap-4 px-4">
            {/* Mode tools */}
            <div className="grid grid-cols-3 gap-2">
              {MODE_TOOLS.map(({ tool, Icon, labelKey }) => (
                <Button
                  key={tool}
                  variant={activeTool === tool ? "default" : "outline"}
                  onClick={() => pickTool(tool)}
                  className="h-16 flex-col gap-1"
                >
                  <Icon className="size-5" />
                  <span className="text-[11px] font-normal">{t(labelKey)}</span>
                </Button>
              ))}
            </div>

            {/* Actions */}
            <div>
              <span className="px-1 text-xs text-muted-foreground">{t("tools.actions")}</span>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <Button variant="outline" disabled={!canUndo} onClick={() => undo()} className="h-12 flex-col gap-1">
                  <Undo className="size-5" />
                  <span className="text-[11px] font-normal">{t("tools.undo")}</span>
                </Button>
                <Button variant="outline" disabled={!canRedo} onClick={() => redo()} className="h-12 flex-col gap-1">
                  <Redo className="size-5" />
                  <span className="text-[11px] font-normal">{t("tools.redo")}</span>
                </Button>
                <Button
                  variant="destructive"
                  disabled={!selectedId}
                  onClick={onDelete}
                  className="h-12 flex-col gap-1"
                >
                  <Trash2 className="size-5" />
                  <span className="text-[11px] font-normal">{t("tools.delete")}</span>
                </Button>
              </div>
            </div>

            {/* View — systems / settings open their own modals */}
            <div>
              <span className="px-1 text-xs text-muted-foreground">{t("tools.view")}</span>
              <div className="mt-1 flex flex-col gap-1">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    setView("systems");
                  }}
                  className="h-12 w-full justify-start gap-3 px-3"
                >
                  <Layers3 className="size-5" />
                  <span className="text-sm font-normal">{t("systems.title")}</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    setView("settings");
                  }}
                  className="h-12 w-full justify-start gap-3 px-3"
                >
                  <Settings2 className="size-5" />
                  <span className="text-sm font-normal">{t("settings.title")}</span>
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Modals — siblings of the sheet so closing the sheet keeps them mounted */}
      <SystemsPanel hideTrigger open={view === "systems"} onOpenChange={(o) => setView(o ? "systems" : null)} />
      <SettingsPanel hideTrigger open={view === "settings"} onOpenChange={(o) => setView(o ? "settings" : null)} />
    </>
  );
};

export default MobileToolbar;
