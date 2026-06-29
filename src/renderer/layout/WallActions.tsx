/**
 * WallActions — the mobile entry point for editing the selected wall.
 *
 * A fixed-corner action button (anchored to a screen corner, NOT floated on the
 * wall, so it never collides with the wall's dimension annotation) opens a modal
 * holding WallPropertiesForm. Desktop edits the same wall through the always-on
 * Inspector, so this button is hidden from the `md` breakpoint up.
 */

import { useState, useEffect } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelectionStore } from "@/store/selection.store";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useToolsStore } from "@/store/tools.store";
import { useTranslation } from "@/i18n";
import WallPropertiesForm, { isWallLike } from "./WallPropertiesForm";

const WallActions = () => {
  const { t } = useTranslation();
  const tool = useToolsStore((s) => s.tool);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const shapes = useFloorPlanStore((s) => s.shapes);

  const [open, setOpen] = useState(false);

  const selected = selectedId ? shapes[selectedId] : undefined;
  const wall = isWallLike(selected) ? selected : null;

  // Close the modal whenever the selection leaves a wall
  useEffect(() => {
    if (!wall) setOpen(false);
  }, [wall]);

  if (tool !== "select" || !wall) return null;

  return (
    <>
      {/* Fixed-corner button — floats above the bottom tool dock (bottom-right),
          clear of on-canvas dimensions which hug the walls. Mobile only. */}
      <div className="fixed bottom-18 right-4 z-40 md:hidden">
        <Button
          variant="secondary"
          title={t("wall.actions")}
          className="size-12 rounded-full shadow-2xl"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal className="size-5" />
        </Button>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 supports-backdrop-filter:backdrop-blur-xs md:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-[min(94vw,24rem)] flex-col gap-4 overflow-y-auto rounded-xl border bg-popover p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("wall.title")}</span>
              <Button size="icon-xs" variant="ghost" title={t("common.close")} onClick={() => setOpen(false)}>
                <X size={14} />
              </Button>
            </div>

            <WallPropertiesForm key={wall.id} wall={wall} />
          </div>
        </div>
      )}
    </>
  );
};

export default WallActions;
