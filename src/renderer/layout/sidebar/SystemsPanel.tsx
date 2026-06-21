/**
 * SystemsPanel — modal listing the discipline/system categories with a
 * per-category visibility toggle (the foundation of the layer system).
 *
 * Every shape belongs to a category (Architectural by default); hiding a
 * category removes its shapes from the canvas. Discipline tools (electrical,
 * plumbing, roof, …) will populate the currently-empty categories later.
 *
 * Open state can be controlled (so the mobile tool sheet can drive it from
 * outside) or self-managed via the built-in icon trigger.
 */

import { useState } from "react";
import { Layers3, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLayersStore } from "@/store/layers.store";
import { SYSTEM_CATEGORIES } from "@/core/layers/systemCategories";
import { useTranslation } from "@/i18n";

interface Props {
  /** Controlled open state. Omit to use the internal state + icon trigger. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide the built-in icon trigger (when an external control opens the panel). */
  hideTrigger?: boolean;
}

const SystemsPanel = ({ open: openProp, onOpenChange, hideTrigger }: Props) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const { t } = useTranslation();

  const visibility = useLayersStore((s) => s.visibility);
  const toggleCategory = useLayersStore((s) => s.toggleCategory);

  return (
    <>
      {!hideTrigger && (
        <Button
          size="icon"
          variant={open ? "default" : "ghost"}
          title={t("systems.tooltip")}
          onClick={() => setOpen(!open)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <Layers3 size={16} />
        </Button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 supports-backdrop-filter:backdrop-blur-xs"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-[min(94vw,22rem)] flex-col gap-0.5 overflow-y-auto rounded-xl border bg-popover p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1">
              <span className="text-sm font-medium">{t("systems.title")}</span>
              <Button size="icon-xs" variant="ghost" title={t("common.close")} onClick={() => setOpen(false)}>
                <X size={14} />
              </Button>
            </div>
            {SYSTEM_CATEGORIES.map((cat) => {
              const visible = visibility[cat.id];
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className="flex items-center gap-2 rounded-md px-2 py-2.5 text-sm hover:bg-accent"
                  aria-pressed={visible}
                >
                  <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: cat.color }} />
                  <span
                    className={
                      visible
                        ? "flex-1 text-start text-foreground"
                        : "flex-1 text-start text-muted-foreground line-through"
                    }
                  >
                    {t(`systems.categories.${cat.id}`)}
                  </span>
                  {visible ? (
                    <Eye size={16} className="shrink-0 text-muted-foreground" />
                  ) : (
                    <EyeOff size={16} className="shrink-0 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default SystemsPanel;
