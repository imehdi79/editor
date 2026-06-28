/**
 * Inspector — the desktop right property panel (md+).
 *
 * Persistent on desktop: it shows the selected element's properties (the rich
 * WallPropertiesForm for walls/arc walls, a minimal header + delete for other
 * shapes) and an empty-state hint when nothing is selected. Mobile edits the
 * selection through the WallActions modal instead.
 */

import { MousePointerSquareDashed, Trash2, type LucideIcon } from "lucide-react";
import { useSelectionStore } from "@/store/selection.store";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useTranslation, type TranslationKey } from "@/i18n";
import type { Shape } from "@/core/drawing-engine/drawing.types";
import { MODE_TOOLS } from "./editorTools";
import WallPropertiesForm, { isWallLike } from "../WallPropertiesForm";

const TYPE_LABEL_KEY: Record<Shape["type"], TranslationKey> = {
  wall: "tools.wall",
  "arc-wall": "tools.arcWall",
  line: "tools.line",
  "dashed-line": "tools.dashedLine",
  text: "tools.text",
  window: "tools.window",
  door: "tools.door",
};

const iconForType = (type: Shape["type"]): LucideIcon =>
  MODE_TOOLS.find((m) => m.tool === type)?.Icon ?? MousePointerSquareDashed;

const Inspector = () => {
  const { t } = useTranslation();
  const selectedId = useSelectionStore((s) => s.selectedId);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const shapes = useFloorPlanStore((s) => s.shapes);
  const removeShape = useFloorPlanStore((s) => s.removeShape);

  const selected = selectedId ? shapes[selectedId] : undefined;

  const onDelete = () => {
    if (!selected) return;
    removeShape(selected.id);
    clearSelection();
  };

  return (
    <aside className="fixed inset-y-12 bottom-7 right-0 z-30 hidden w-72 flex-col overflow-y-auto bg-panel scroll-thin hair md:flex">
      {!selected ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <MousePointerSquareDashed size={28} strokeWidth={1.4} className="text-ink-3" />
          <p className="text-sm text-ink-3">{t("inspector.empty")}</p>
        </div>
      ) : (
        <>
          <div className="flex h-10 flex-none items-center gap-2 px-3 hair">
            {(() => {
              const Icon = iconForType(selected.type);
              return <Icon size={16} strokeWidth={1.75} className="text-brand" />;
            })()}
            <span className="text-base font-semibold">{t(TYPE_LABEL_KEY[selected.type])}</span>
            <span className="rounded-full px-1.5 py-0.5 text-2xs text-ink-3 mono hair">#{selected.id.slice(0, 4)}</span>
            <div className="flex-1" />
            <button
              type="button"
              title={t("tools.delete")}
              aria-label={t("tools.delete")}
              onClick={onDelete}
              className="grid size-7 place-items-center rounded text-ink-3 transition-colors hover:bg-panel-2 hover:text-danger"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="p-3">
            {isWallLike(selected) ? (
              <WallPropertiesForm key={selected.id} wall={selected} />
            ) : (
              <p className="text-sm text-ink-3">{t("inspector.noProps")}</p>
            )}
          </div>
        </>
      )}
    </aside>
  );
};

export default Inspector;
