/**
 * ToolRail — the desktop left tool rail (md+).
 *
 * The persistent vertical CAD toolbar: mode tools (select/draw) from the shared
 * MODE_TOOLS list, then history + delete, and at the foot the view entry points
 * (Systems, Settings, theme toggle). Floats over the left edge of the canvas;
 * the mobile build uses the bottom tool sheet (MobileToolbar) instead.
 */

import { useState } from "react";
import { Undo, Redo, Trash2, Layers3, SlidersHorizontal, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToolsStore } from "@/store/tools.store";
import { useTemporalStore, useFloorPlanStore } from "@/store/floor-plan.store";
import { useSelectionStore } from "@/store/selection.store";
import { useThemeStore } from "@/store/theme.store";
import { useTranslation } from "@/i18n";
import { MODE_TOOLS } from "./editorTools";
import SystemsPanel from "../sidebar/SystemsPanel";
import SettingsPanel from "../sidebar/SettingsPanel";

const RailButton = ({
  active,
  disabled,
  title,
  danger,
  onClick,
  Icon,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  danger?: boolean;
  onClick: () => void;
  Icon: LucideIcon;
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "grid size-9 place-items-center rounded-md transition-colors disabled:opacity-40 disabled:pointer-events-none",
      active
        ? "bg-brand text-brand-foreground"
        : danger
          ? "text-ink-2 hover:bg-panel-2 hover:text-danger"
          : "text-ink-2 hover:bg-panel-2 hover:text-ink",
    )}
  >
    <Icon size={17} strokeWidth={1.75} />
  </button>
);

const ToolRail = () => {
  const { t } = useTranslation();
  const [panel, setPanel] = useState<null | "systems" | "settings">(null);

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

  const onDelete = () => {
    if (!selectedId) return;
    removeShape(selectedId);
    clearSelection();
  };

  return (
    <>
      <nav className="fixed bottom-7 left-0 top-21 z-30 hidden w-12 flex-col items-center gap-1 bg-panel py-2 hair md:flex">
        {MODE_TOOLS.map(({ tool, Icon, labelKey }) => (
          <RailButton
            key={tool}
            Icon={Icon}
            title={t(labelKey)}
            active={activeTool === tool}
            onClick={() => setTool(tool)}
          />
        ))}

        <div className="my-1 h-px w-6 bg-line" />

        <RailButton Icon={Undo} title={t("tools.undo")} disabled={!canUndo} onClick={() => undo()} />
        <RailButton Icon={Redo} title={t("tools.redo")} disabled={!canRedo} onClick={() => redo()} />
        <RailButton Icon={Trash2} title={t("tools.delete")} danger disabled={!selectedId} onClick={onDelete} />

        <div className="flex-1" />

        <RailButton
          Icon={Layers3}
          title={t("systems.title")}
          active={panel === "systems"}
          onClick={() => setPanel(panel === "systems" ? null : "systems")}
        />
        <RailButton
          Icon={SlidersHorizontal}
          title={t("settings.title")}
          active={panel === "settings"}
          onClick={() => setPanel(panel === "settings" ? null : "settings")}
        />
        <RailButton
          Icon={theme === "dark" ? Sun : Moon}
          title={t("settings.theme")}
          onClick={toggleTheme}
        />
      </nav>

      {/* Reuse the existing modals, driven from the rail. */}
      <SystemsPanel hideTrigger open={panel === "systems"} onOpenChange={(o) => setPanel(o ? "systems" : null)} />
      <SettingsPanel hideTrigger open={panel === "settings"} onOpenChange={(o) => setPanel(o ? "settings" : null)} />
    </>
  );
};

export default ToolRail;
