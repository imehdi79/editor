/**
 * DrawingHud — a fixed, off-finger readout of the live drawing state (mobile).
 *
 * On touch the fingertip hides the snap target, the ghost endpoint and the
 * on-canvas dimension label, so this DOM strip mirrors the data the engine
 * already emits in `hints` — segment length + bearing, the active snap target,
 * and any axis / perpendicular lock — at a stable screen position. It recomputes
 * nothing: it only reads DrawingHints. Mobile chrome only (`md:hidden`), so the
 * desktop on-canvas readouts are unchanged.
 */

import { useTranslation, type TranslationKey } from "@/i18n";
import type { DrawingHints, SnapResult } from "@/core/drawing-engine/drawing.types";

const SNAP_LABEL: Record<NonNullable<SnapResult["snapType"]>, TranslationKey> = {
  grid: "hud.snapGrid",
  node: "hud.snapNode",
  midpoint: "hud.snapMidpoint",
  intersection: "hud.snapIntersection",
  edge: "hud.snapEdge",
};

const DrawingHud = ({ hints }: { hints: DrawingHints }) => {
  const { t } = useTranslation();

  const snap = hints.snapResult?.snapped ? hints.snapResult.snapType : null;
  const lockKey: TranslationKey | null = hints.perpLocked
    ? "hud.lockPerpendicular"
    : hints.axisLocked
      ? hints.axisLockAngle === "vertical"
        ? "hud.lockVertical"
        : "hud.lockHorizontal"
      : null;

  // Nothing to report → render nothing (keeps the strip transient, gesture-only).
  if (!hints.dimension && !snap && !lockKey) return null;

  return (
    <div className="pointer-events-none fixed left-1/2 top-20 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-popover/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur-sm md:hidden">
      {hints.dimension && <span className="font-semibold mono tnum">{hints.dimension.text}</span>}
      {snap && (
        <span className="flex items-center gap-1 text-brand">
          <span className="size-1.5 rounded-full bg-brand" />
          {t(SNAP_LABEL[snap])}
        </span>
      )}
      {lockKey && <span className="text-ink-3">{t(lockKey)}</span>}
    </div>
  );
};

export default DrawingHud;
