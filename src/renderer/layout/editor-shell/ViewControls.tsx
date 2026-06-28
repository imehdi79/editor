/**
 * ViewControls — floating canvas controls (md+).
 *
 * Top-left: the 2D ⇄ 3D segmented toggle (drives editor.viewMode; 3D is lazy).
 * Top-right: zoom in / out / fit, operating on the viewport store and zooming
 * about the screen centre. The right cluster shifts in when the inspector is
 * open so it never hides behind it.
 */

import { Plus, Minus, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor.store";
import { useViewportStore, MIN_SCALE, MAX_SCALE } from "@/store/viewport.store";
import { useTranslation } from "@/i18n";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const DimButton = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "h-7 rounded px-3 text-xs font-semibold transition-colors",
      active ? "bg-brand text-brand-foreground" : "text-ink-2 hover:text-ink",
    )}
  >
    {label}
  </button>
);

const ZoomButton = ({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    className="grid size-7 place-items-center rounded text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
  >
    {children}
  </button>
);

const ViewControls = () => {
  const { t } = useTranslation();
  const viewMode = useEditorStore((s) => s.viewMode);
  const setViewMode = useEditorStore((s) => s.setViewMode);
  const { x, y, scale, setViewport, resetViewport } = useViewportStore();

  const zoomBy = (factor: number) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const next = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
    const wx = (cx - x) / scale;
    const wy = (cy - y) / scale;
    setViewport(cx - wx * next, cy - wy * next, next);
  };

  return (
    <>
      {/* 2D / 3D toggle */}
      <div className="fixed left-14 top-14 z-30 hidden rounded-md bg-panel p-0.5 shadow-soft hair md:flex">
        <DimButton active={viewMode === "2d"} label="2D" onClick={() => setViewMode("2d")} />
        <DimButton active={viewMode === "3d"} label="3D" onClick={() => setViewMode("3d")} />
      </div>

      {/* Zoom cluster — only meaningful in 2D */}
      {viewMode === "2d" && (
        <div className="fixed right-76 top-14 z-30 hidden rounded-md bg-panel p-0.5 shadow-soft hair md:flex">
          <ZoomButton title={t("view.zoomIn")} onClick={() => zoomBy(1.2)}>
            <Plus size={15} />
          </ZoomButton>
          <ZoomButton title={t("view.zoomOut")} onClick={() => zoomBy(0.83)}>
            <Minus size={15} />
          </ZoomButton>
          <ZoomButton title={t("view.fit")} onClick={() => resetViewport()}>
            <Maximize size={15} />
          </ZoomButton>
        </div>
      )}
    </>
  );
};

export default ViewControls;
