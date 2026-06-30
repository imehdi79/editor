/**
 * MobileZoomControls — floating zoom cluster (mobile only, hidden on md+).
 *
 * Pinch stays the primary zoom; this adds a quick zoom-to-fit (recovery) plus
 * step zoom in/out about the screen centre, reusing the same useViewportZoom
 * helpers as the desktop ViewControls so the behaviour matches. Anchored
 * bottom-left so it clears the bottom tool dock and the bottom-right wall FAB.
 * Only meaningful in 2D.
 */

import { Plus, Minus, Maximize } from "lucide-react";
import { useEditorStore } from "@/store/editor.store";
import { useViewportZoom } from "@/renderer/2d/useViewportZoom";
import { useTranslation } from "@/i18n";

const ZoomButton = ({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    className="grid size-11 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
  >
    {children}
  </button>
);

const MobileZoomControls = () => {
  const { t } = useTranslation();
  const viewMode = useEditorStore((s) => s.viewMode);
  const { zoomBy, fit } = useViewportZoom();

  if (viewMode !== "2d") return null;

  return (
    <div className="fixed bottom-20 left-3 z-40 flex flex-col rounded-xl border bg-popover/95 p-0.5 shadow-lg backdrop-blur-sm md:hidden">
      <ZoomButton title={t("view.zoomIn")} onClick={() => zoomBy(1.2)}>
        <Plus className="size-5" />
      </ZoomButton>
      <ZoomButton title={t("view.zoomOut")} onClick={() => zoomBy(0.83)}>
        <Minus className="size-5" />
      </ZoomButton>
      <ZoomButton title={t("view.fit")} onClick={fit}>
        <Maximize className="size-5" />
      </ZoomButton>
    </div>
  );
};

export default MobileZoomControls;
