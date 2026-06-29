/**
 * EstimatePanel — the in-editor cost estimate, surfaced from the tool rail.
 *
 * A modal over the canvas hosting the shared DrawingEstimatePanel, so the live
 * plan can be costed without leaving the editor. Open state can be controlled
 * (driven by the rail) or self-managed via the built-in trigger. Read-only — it
 * reads the drawing + the admin catalog/pricing and writes nothing.
 */

import { useState } from "react";
import { Calculator, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { DrawingEstimatePanel } from "@/components/estimation/DrawingEstimatePanel";

interface Props {
  /** Controlled open state. Omit to use the internal state + icon trigger. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide the built-in icon trigger (when an external control opens the panel). */
  hideTrigger?: boolean;
}

const EstimatePanel = ({ open: openProp, onOpenChange, hideTrigger }: Props) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const { t } = useTranslation();

  return (
    <>
      {!hideTrigger && (
        <Button
          size="icon"
          variant={open ? "default" : "ghost"}
          title={t("admin.estimate")}
          onClick={() => setOpen(!open)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <Calculator size={16} />
        </Button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 supports-backdrop-filter:backdrop-blur-xs"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-[min(94vw,32rem)] flex-col overflow-y-auto rounded-xl bg-panel p-4 shadow-2xl scroll-thin hair"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Calculator size={16} className="text-brand" />
                <span className="text-sm font-semibold">{t("admin.estimate")}</span>
              </div>
              <Button size="icon-xs" variant="ghost" title={t("common.close")} onClick={() => setOpen(false)}>
                <X size={14} />
              </Button>
            </div>
            <DrawingEstimatePanel />
          </div>
        </div>
      )}
    </>
  );
};

export default EstimatePanel;
