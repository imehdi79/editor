/**
 * NodeThicknessPopover — on-canvas editor for a wall's thickness, opened by
 * tapping one of the wall's endpoint node handles (see useTransformEngine's
 * onNodeTap). It is a DOM overlay (not a Konva node) anchored at the tapped
 * node's screen position, computed from the viewport transform so it tracks
 * pan/zoom.
 *
 * Edits the selected wall only; hosted openings stay in sync via
 * useSetWallThickness. Closes on outside-click, Escape, or when the target
 * stops being a wall (deleted / deselected elsewhere).
 */

import { useEffect, useRef } from "react";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { useViewportStore } from "@/store/viewport.store";
import { toPx, toUnit, stepFor } from "@/core/dimensions/dimensionUnits";
import { useSetWallThickness } from "@/features/wall-tool/useWallThickness";
import { useTranslation } from "@/i18n";

interface Props {
  shapeId: string;
  handle: "p1" | "p2";
  onClose: () => void;
}

const NodeThicknessPopover = ({ shapeId, handle, onClose }: Props) => {
  const { t } = useTranslation();
  const shape = useFloorPlanStore((s) => s.shapes[shapeId]);
  const unit = useEditorStore((s) => s.dimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const vx = useViewportStore((s) => s.x);
  const vy = useViewportStore((s) => s.y);
  const scale = useViewportStore((s) => s.scale);
  const setWallThickness = useSetWallThickness();
  const cardRef = useRef<HTMLDivElement>(null);

  const isWall = !!shape && (shape.type === "wall" || shape.type === "arc-wall");

  // Close if the target is no longer a wall (deleted, type changed, …).
  useEffect(() => {
    if (!isWall) onClose();
  }, [isWall, onClose]);

  // Dismiss on outside-click (incl. tapping the canvas) or Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!isWall) return null;

  // Node world position → screen px (the stage fills the viewport at 0,0).
  const nodeX = handle === "p1" ? shape.x1 : shape.x2;
  const nodeY = handle === "p1" ? shape.y1 : shape.y2;
  const left = nodeX * scale + vx;
  const top = nodeY * scale + vy;

  return (
    <div
      ref={cardRef}
      className="fixed z-40 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-lg border bg-popover p-1.5 text-xs shadow-2xl"
      style={{ left, top: top - 14 }}
    >
      <span className="text-muted-foreground">{t("wall.thickness")}</span>
      <input
        type="number"
        autoFocus
        min={stepFor(unit)}
        step={stepFor(unit)}
        value={toUnit(shape.thickness, unit, ppm)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") onClose();
        }}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v) && v >= stepFor(unit)) setWallThickness(shapeId, toPx(v, unit, ppm));
        }}
        className="h-7 w-16 rounded-md border bg-background px-2 text-right outline-none focus-visible:border-ring"
      />
      <span className="w-5 text-muted-foreground">{unit}</span>
    </div>
  );
};

export default NodeThicknessPopover;
