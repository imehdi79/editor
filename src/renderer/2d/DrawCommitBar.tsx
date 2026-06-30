/**
 * DrawCommitBar — confirm / discard affordance for a deferred (touch) commit.
 *
 * On touch a finished segment is held unconfirmed (see useDrawingEngine) so its
 * occluded endpoint can be checked or nudged before it is written. This bar
 * commits or discards it. Rendered only while a segment is pending — which only
 * happens on a coarse pointer — so it never appears for mouse users.
 */

import { Check, X } from "lucide-react";
import { useTranslation } from "@/i18n";

const DrawCommitBar = ({ onConfirm, onDiscard }: { onConfirm: () => void; onDiscard: () => void }) => {
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-popover/95 p-1.5 shadow-lg backdrop-blur-sm">
      <button
        type="button"
        onClick={onDiscard}
        className="flex h-11 items-center gap-1.5 rounded-full px-4 text-sm text-ink-2 transition-colors hover:bg-panel-2 hover:text-danger"
      >
        <X className="size-5" />
        {t("common.cancel")}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="flex h-11 items-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
      >
        <Check className="size-5" />
        {t("common.confirm")}
      </button>
    </div>
  );
};

export default DrawCommitBar;
