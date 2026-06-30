/**
 * MobileToolbar — the mobile CAD chrome (hidden on md+).
 *
 * A persistent bottom tool dock mirrors the desktop tool rail: the mode tools
 * (select/draw) in a horizontally-scrollable row with the active one in brand,
 * and a trailing "More" button. One tap switches tool — no nested menus — and
 * every target is ≥44px (Apple HIG).
 *
 * "More" opens a bottom sheet for the secondary controls (undo/redo, delete,
 * Systems, Settings, theme). Systems/Settings render as siblings of the sheet so
 * closing it doesn't unmount them.
 */

import { useState } from "react";
import { Redo, Undo, Trash2, Layers3, Settings2, MoreHorizontal, Moon, Sun, Hand } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToolsStore } from "@/store/tools.store";
import { useTemporalStore, useFloorPlanStore } from "@/store/floor-plan.store";
import { useSelectionStore } from "@/store/selection.store";
import { useThemeStore } from "@/store/theme.store";
import { useTranslation } from "@/i18n";
import type { NoOneClickTools } from "./sidebar/tools.types";
import { MODE_TOOLS } from "./editor-shell/editorTools";
import SystemsPanel from "./sidebar/SystemsPanel";
import SettingsPanel from "./sidebar/SettingsPanel";

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

  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const pickTool = (tool: NoOneClickTools) => setTool(tool);

  const onDelete = () => {
    if (!selectedId) return;
    removeShape(selectedId);
    clearSelection();
    setOpen(false);
  };

  return (
    <>
      {/* Persistent bottom tool dock — the mobile counterpart of the tool rail */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center gap-1 border-t bg-popover/95 px-1.5 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
        <div className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
          {/* Pan/hand — a first-class mode (tool = null) so the canvas can be
              repositioned without a drawing tool active and without zoom risk. */}
          <button
            type="button"
            title={t("tools.pan")}
            aria-label={t("tools.pan")}
            aria-pressed={activeTool === null}
            onClick={() => setTool(null)}
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-lg transition-colors",
              activeTool === null ? "bg-brand text-brand-foreground" : "text-ink-2 hover:bg-panel-2 hover:text-ink",
            )}
          >
            <Hand className="size-5.5" strokeWidth={1.75} />
          </button>

          {MODE_TOOLS.map(({ tool, Icon, labelKey }) => (
            <button
              key={tool}
              type="button"
              title={t(labelKey)}
              aria-label={t(labelKey)}
              aria-pressed={activeTool === tool}
              onClick={() => pickTool(tool)}
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-lg transition-colors",
                activeTool === tool ? "bg-brand text-brand-foreground" : "text-ink-2 hover:bg-panel-2 hover:text-ink",
              )}
            >
              <Icon className="size-5.5" strokeWidth={1.75} />
            </button>
          ))}
        </div>

        <div className="h-7 w-px shrink-0 bg-line" />

        <button
          type="button"
          title={t("tools.actions")}
          aria-label={t("tools.actions")}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="grid size-11 shrink-0 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
        >
          <MoreHorizontal className="size-5.5" />
        </button>
      </nav>

      {/* Secondary controls — history, delete, panels, theme */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>{t("tools.title")}</DrawerTitle>
          </DrawerHeader>

          <div className="flex flex-col gap-4 px-4">
            {/* Actions */}
            <div>
              <span className="px-1 text-2xs uppercase tracking-wider text-ink-3 mono">{t("tools.actions")}</span>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <Button variant="outline" disabled={!canUndo} onClick={() => undo()} className="h-12 flex-col gap-1">
                  <Undo className="size-5" />
                  <span className="text-[11px] font-normal">{t("tools.undo")}</span>
                </Button>
                <Button variant="outline" disabled={!canRedo} onClick={() => redo()} className="h-12 flex-col gap-1">
                  <Redo className="size-5" />
                  <span className="text-[11px] font-normal">{t("tools.redo")}</span>
                </Button>
                <Button variant="destructive" disabled={!selectedId} onClick={onDelete} className="h-12 flex-col gap-1">
                  <Trash2 className="size-5" />
                  <span className="text-[11px] font-normal">{t("tools.delete")}</span>
                </Button>
              </div>
            </div>

            {/* View — systems / settings open their own modals; theme toggles inline */}
            <div>
              <span className="px-1 text-2xs uppercase tracking-wider text-ink-3 mono">{t("tools.view")}</span>
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
                <Button variant="ghost" onClick={toggleTheme} className="h-12 w-full justify-start gap-3 px-3">
                  {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
                  <span className="text-sm font-normal">
                    {t("settings.theme")} · {t(theme === "dark" ? "settings.themeLight" : "settings.themeDark")}
                  </span>
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
