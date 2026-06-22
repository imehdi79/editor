/**
 * NodeThicknessPopover — on-canvas editor for a wall node, opened by tapping one
 * of the wall's endpoint node handles (see useTransformEngine's onNodeTap). It is
 * a DOM overlay (not a Konva node) anchored at the tapped node's screen position,
 * computed from the viewport transform so it tracks pan/zoom.
 *
 * Edits:
 *   - the wall's thickness at this node (tapering the wall; openings stay in sync)
 *   - the node's JOIN style — shown only when 2+ walls meet here. The join is a
 *     property of the node, so the change propagates to every connected wall
 *     (useSetNodeJoin); the global default applies when unset.
 *
 * Closes on outside-click, Escape, or when the target stops being a wall.
 */

import { useEffect, useRef, useState } from "react";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { useViewportStore } from "@/store/viewport.store";
import { Button } from "@/components/ui/button";
import { toPx, toUnit, stepFor } from "@/core/dimensions/dimensionUnits";
import { endThickness } from "@/core/wall-utils/wallThickness";
import { computeWallJunctions, junctionAt } from "@/core/wall-junctions";
import type { JoinStyle } from "@/core/drawing-engine/drawing.types";
import { useSetWallThickness, useSetWallEndThickness } from "@/features/wall-tool/useWallThickness";
import { useSetNodeJoin } from "@/features/wall-tool/useNodeJoin";
import { useTranslation, type TranslationKey } from "@/i18n";

/** Join styles offered at a node — labels resolved via i18n. */
const JOIN_STYLES = [
  { value: "miter", key: "joinStyle.miter" },
  { value: "butt", key: "joinStyle.butt" },
  { value: "bevel", key: "joinStyle.bevel" },
  { value: "round", key: "joinStyle.round" },
] satisfies { value: JoinStyle; key: TranslationKey }[];

/** Allow only an in-progress positive decimal (incl. "" and "."). */
const NUMERIC_DRAFT = /^\d*\.?\d*$/;

/**
 * Thickness text input with a local draft so it can be cleared and retyped (a
 * `type="number"` controlled input snaps back on clear). Own component so its
 * hooks sit below the popover's early returns. Commits valid values live.
 */
const ThicknessInput = ({
  valueUnit,
  min,
  onCommit,
  onClose,
}: {
  valueUnit: number;
  min: number;
  onCommit: (v: number) => void;
  onClose: () => void;
}) => {
  const [draft, setDraft] = useState(() => String(valueUnit));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(String(valueUnit));
  }, [valueUnit, editing]);

  return (
    <input
      type="text"
      inputMode="decimal"
      autoFocus
      value={draft}
      onFocus={(e) => {
        setEditing(true);
        e.target.select();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClose();
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== "" && !NUMERIC_DRAFT.test(raw)) return;
        setDraft(raw);
        const v = Number(raw);
        if (raw.trim() !== "" && !Number.isNaN(v) && v >= min) onCommit(v);
      }}
      onBlur={(e) => {
        setEditing(false);
        const v = Number(e.target.value);
        if (e.target.value.trim() === "" || Number.isNaN(v) || v < min) setDraft(String(valueUnit));
      }}
      className="h-7 w-16 rounded-md border bg-background px-2 text-right outline-none focus-visible:border-ring"
    />
  );
};

interface Props {
  shapeId: string;
  handle: "p1" | "p2";
  onClose: () => void;
}

const NodeThicknessPopover = ({ shapeId, handle, onClose }: Props) => {
  const { t } = useTranslation();
  const shapes = useFloorPlanStore((s) => s.shapes);
  const shape = shapes[shapeId];
  const unit = useEditorStore((s) => s.dimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const wallJoinStyle = useEditorStore((s) => s.wallJoinStyle);
  const vx = useViewportStore((s) => s.x);
  const vy = useViewportStore((s) => s.y);
  const scale = useViewportStore((s) => s.scale);
  const setWallThickness = useSetWallThickness();
  const setWallEndThickness = useSetWallEndThickness();
  const setNodeJoin = useSetNodeJoin();
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

  // Straight walls taper per node; arc walls stay uniform (one thickness).
  const tapered = shape.type === "wall";
  const valuePx = tapered ? endThickness(shape, handle) : shape.thickness;
  const commit = (px: number) =>
    tapered ? setWallEndThickness(shapeId, handle, px) : setWallThickness(shapeId, px);

  // Join is only meaningful where two or more walls meet at this node.
  const junction = junctionAt(nodeX, nodeY, computeWallJunctions(shapes));
  const isJunction = !!junction && junction.ends.length >= 2;
  const currentJoin = junction?.joinStyle ?? wallJoinStyle;

  return (
    <div
      ref={cardRef}
      className="fixed z-40 flex -translate-x-1/2 -translate-y-full flex-col gap-1.5 rounded-lg border bg-popover p-1.5 text-xs shadow-2xl"
      style={{ left, top: top - 14 }}
    >
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">{t("wall.thickness")}</span>
        <ThicknessInput
          valueUnit={toUnit(valuePx, unit, ppm)}
          min={stepFor(unit)}
          onCommit={(v) => commit(toPx(v, unit, ppm))}
          onClose={onClose}
        />
        <span className="w-5 text-muted-foreground">{unit}</span>
      </div>

      {isJunction && (
        <div className="flex flex-col gap-1 border-t pt-1.5">
          <span className="text-[11px] text-muted-foreground">{t("settings.wallJoin")}</span>
          <div className="flex gap-1">
            {JOIN_STYLES.map((opt) => (
              <Button
                key={opt.value}
                size="xs"
                variant={currentJoin === opt.value ? "default" : "outline"}
                className="flex-1 px-1"
                onClick={() => setNodeJoin(shapeId, handle, opt.value)}
              >
                {t(opt.key)}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NodeThicknessPopover;
