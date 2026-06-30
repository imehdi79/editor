/**
 * SelectionActions — the mobile editor entry point for the current selection.
 *
 * A fixed-corner button (anchored to a screen corner, clear of on-canvas
 * dimensions) opens a modal whose contents follow the selection: the rich
 * WallPropertiesForm for walls / arc walls, SpacePropertiesForm for a selected
 * room, or a minimal header + delete for any other shape. Desktop edits the same
 * things through the always-on Inspector, so this is hidden from the `md`
 * breakpoint up. Replaces the wall-only WallActions.
 */

import { useEffect } from "react";
import { SlidersHorizontal, X, Trash2, Square, MousePointerSquareDashed, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelectionStore } from "@/store/selection.store";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useToolsStore } from "@/store/tools.store";
import { useMobileUiStore } from "@/store/mobile-ui.store";
import { computeSpaces } from "@/core/spaces/computeSpaces";
import { useTranslation, type TranslationKey } from "@/i18n";
import type { Shape } from "@/core/drawing-engine/drawing.types";
import { MODE_TOOLS } from "./editor-shell/editorTools";
import WallPropertiesForm, { isWallLike } from "./WallPropertiesForm";
import SpacePropertiesForm from "./SpacePropertiesForm";

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

const SelectionActions = () => {
  const { t } = useTranslation();
  const tool = useToolsStore((s) => s.tool);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const selectedSpaceId = useSelectionStore((s) => s.selectedSpaceId);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const shapes = useFloorPlanStore((s) => s.shapes);
  const removeShape = useFloorPlanStore((s) => s.removeShape);

  // Open state lives in the store so a canvas long-press can open this too.
  const open = useMobileUiStore((s) => s.editorOpen);
  const openEditor = useMobileUiStore((s) => s.openEditor);
  const closeEditor = useMobileUiStore((s) => s.closeEditor);

  const selected = selectedId ? shapes[selectedId] : undefined;
  // A selected space resolves against the live (cached) geometry; numbering
  // matches the on-canvas "Space N" label (largest-first).
  const spaces = computeSpaces(shapes);
  const spaceIndex = selectedSpaceId ? spaces.findIndex((sp) => sp.id === selectedSpaceId) : -1;
  const space = spaceIndex >= 0 ? spaces[spaceIndex] : undefined;

  const hasSelection = !!selected || !!space;

  // Close the modal whenever the selection clears.
  useEffect(() => {
    if (!hasSelection) closeEditor();
  }, [hasSelection, closeEditor]);

  if (tool !== "select" || !hasSelection) return null;

  const onDelete = () => {
    if (!selected) return;
    removeShape(selected.id);
    clearSelection();
    closeEditor();
  };

  const title = space
    ? `${t("drawingInfo.types.space")} ${spaceIndex + 1}`
    : selected
      ? t(TYPE_LABEL_KEY[selected.type])
      : t("inspector.edit");

  return (
    <>
      {/* Fixed-corner button — floats above the bottom tool dock (bottom-right),
          clear of on-canvas dimensions which hug the walls. Mobile only. */}
      <div className="fixed bottom-18 right-4 z-40 md:hidden">
        <Button
          variant="secondary"
          title={t("inspector.edit")}
          className="size-12 rounded-full shadow-2xl"
          onClick={openEditor}
        >
          <SlidersHorizontal className="size-5" />
        </Button>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 supports-backdrop-filter:backdrop-blur-xs md:hidden"
          onClick={closeEditor}
        >
          <div
            className="flex max-h-[85vh] w-[min(94vw,24rem)] flex-col gap-4 overflow-y-auto rounded-xl border bg-popover p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              {space ? (
                <Square className="size-4 text-brand" strokeWidth={1.75} />
              ) : selected ? (
                (() => {
                  const Icon = iconForType(selected.type);
                  return <Icon className="size-4 text-brand" strokeWidth={1.75} />;
                })()
              ) : (
                <SlidersHorizontal className="size-4 text-brand" strokeWidth={1.75} />
              )}
              <span className="text-sm font-medium">{title}</span>
              <div className="flex-1" />
              {selected && (
                <Button size="icon-xs" variant="ghost" title={t("tools.delete")} onClick={onDelete}>
                  <Trash2 size={14} />
                </Button>
              )}
              <Button size="icon-xs" variant="ghost" title={t("common.close")} onClick={closeEditor}>
                <X size={14} />
              </Button>
            </div>

            {space ? (
              <SpacePropertiesForm space={space} />
            ) : selected && isWallLike(selected) ? (
              <WallPropertiesForm key={selected.id} wall={selected} />
            ) : (
              <p className="text-sm text-ink-3">{t("inspector.noProps")}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SelectionActions;
