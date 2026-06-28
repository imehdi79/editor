/**
 * StatusBar — the desktop bottom status strip (md+).
 *
 * Reads-only chrome: the active tool, the live pointer coordinates (from
 * pointer.store, in the active unit), the current unit, zoom level, and a snap
 * indicator. All values come from stores; nothing here mutates the document.
 */

import { Ruler, Magnet } from "lucide-react";
import { useToolsStore } from "@/store/tools.store";
import { useViewportStore } from "@/store/viewport.store";
import { useEditorStore } from "@/store/editor.store";
import { usePointerStore } from "@/store/pointer.store";
import { toUnit } from "@/core/dimensions/dimensionUnits";
import { useTranslation } from "@/i18n";
import { MODE_TOOLS } from "./editorTools";

const StatusBar = () => {
  const { t } = useTranslation();
  const tool = useToolsStore((s) => s.tool);
  const scale = useViewportStore((s) => s.scale);
  const unit = useEditorStore((s) => s.dimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const world = usePointerStore((s) => s.world);

  const toolLabel = tool
    ? t(MODE_TOOLS.find((m) => m.tool === tool)?.labelKey ?? "tools.select").toUpperCase()
    : t("tools.pan").toUpperCase();

  const coord = (v: number) => Math.round(toUnit(v, unit, ppm) * 10) / 10;

  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 hidden h-7 items-center gap-4 bg-panel px-3 text-2xs text-ink-3 mono md:flex">
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-sm bg-brand" />
        {toolLabel}
      </span>
      <span className="text-ink-2 tnum">
        {world ? `x ${coord(world.x)}  y ${coord(world.y)} ${unit}` : `x —  y — ${unit}`}
      </span>
      <span className="ms-auto flex items-center gap-1">
        <Ruler size={12} strokeWidth={1.75} />
        {unit}
      </span>
      <span className="tnum">{Math.round(scale * 100)}%</span>
      <span className="flex items-center gap-1 text-brand">
        <Magnet size={12} strokeWidth={1.75} />
        {t("statusBar.snap")}
      </span>
    </footer>
  );
};

export default StatusBar;
