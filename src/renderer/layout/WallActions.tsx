/**
 * WallActions — a fixed-corner action button for the selected wall.
 *
 * Shows only when the select tool is active and a wall is selected. The button
 * is anchored to a fixed screen corner (NOT floated on the wall) so it never
 * collides with the wall's dimension annotation, which sits on the wall's
 * normal side. Clicking it opens a modal to:
 *   - edit the selected wall's thickness (kept in sync on hosted openings)
 *   - edit the selected wall's height (real units; not drawn in 2D, used for
 *     surface-area takeoff in the drawing-info table)
 *   - align all doors/windows on that wall to one swing/hinge direction
 */

import { useState, useEffect } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSelectionStore } from "@/store/selection.store";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useToolsStore } from "@/store/tools.store";
import { useEditorStore } from "@/store/editor.store";
import { toPx, toUnit, cmToPx, pxToCm, stepFor, formatDimension } from "@/core/dimensions/dimensionUnits";
import { absoluteAngleDeg } from "@/core/wall-utils/wallAngles";
import { arcFromChordBulge } from "@/core/arc/arcGeometry";
import type { Shape, WallShape, ArcWallShape, DoorShape } from "@/core/drawing-engine/drawing.types";
import { useTranslation } from "@/i18n";
import { useSetWallThickness } from "@/features/wall-tool/useWallThickness";
import { NumberField } from "@/components/ui/number-field";
import WallLayersPanel from "./WallLayersPanel";

/** Wall or arc wall — both carry thickness/height/offset and editable properties. */
const isWallLike = (s: Shape | undefined): s is WallShape | ArcWallShape =>
  !!s && (s.type === "wall" || s.type === "arc-wall");

type WallTab = "properties" | "layers";

const WallActions = () => {
  const { t } = useTranslation();
  const tool = useToolsStore((s) => s.tool);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const shapes = useFloorPlanStore((s) => s.shapes);
  const updateShape = useFloorPlanStore((s) => s.updateShape);
  const defaultWallHeight = useEditorStore((s) => s.defaultWallHeight);
  const unit = useEditorStore((s) => s.dimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const setWallThickness = useSetWallThickness();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<WallTab>("properties");

  const selected = selectedId ? shapes[selectedId] : undefined;
  const wall = isWallLike(selected) ? selected : null;
  const isArc = wall?.type === "arc-wall";

  // Close the modal whenever the selection leaves a wall
  useEffect(() => {
    if (!wall) setOpen(false);
  }, [wall]);

  // Reset to the first tab each time the panel is opened for a fresh selection
  useEffect(() => {
    if (open) setTab("properties");
  }, [open]);

  if (tool !== "select" || !wall) return null;

  // Openings hosted on this wall (arc walls don't host openings yet → empty)
  const openings = Object.values(shapes).filter(
    (s) => (s.type === "door" || s.type === "window") && s.wallId === wall.id,
  ) as (DoorShape | Extract<Shape, { type: "window" }>)[];
  const doors = openings.filter((s): s is DoorShape => s.type === "door");

  // Length / angle (touch-friendly numeric alternatives to dragging the handles).
  const lengthPx = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
  const bearingDeg = absoluteAngleDeg(wall.x1, wall.y1, wall.x2, wall.y2);

  // Resize by length — anchor p1, keep the current direction (default East if
  // the wall is degenerate), move p2.
  const setLength = (lenUnit: number) => {
    const lenPx = toPx(lenUnit, unit, ppm);
    const cur = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
    const ux = cur > 1e-6 ? (wall.x2 - wall.x1) / cur : 1;
    const uy = cur > 1e-6 ? (wall.y2 - wall.y1) / cur : 0;
    updateShape(wall.id, { x2: wall.x1 + ux * lenPx, y2: wall.y1 + uy * lenPx });
  };

  // Rotate to an absolute bearing — pivot the midpoint, preserve length. Bearing
  // is CCW from East (canvas Y is down, so the y component is negated).
  const setAngle = (deg: number) => {
    const mx = (wall.x1 + wall.x2) / 2;
    const my = (wall.y1 + wall.y2) / 2;
    const half = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1) / 2;
    const rad = (deg * Math.PI) / 180;
    const ux = Math.cos(rad);
    const uy = -Math.sin(rad);
    updateShape(wall.id, {
      x1: mx - ux * half,
      y1: my - uy * half,
      x2: mx + ux * half,
      y2: my + uy * half,
    });
  };

  // Keep hosted openings visually consistent with the wall they cut.
  const setThickness = (thickness: number) => setWallThickness(wall.id, thickness);

  const setHeight = (height: number) => updateShape(wall.id, { height });

  const setOffset = (offset: number) => updateShape(wall.id, { offset });

  const setBulge = (bulge: number) => updateShape(wall.id, { bulge });

  // Renovation phase — mark the wall as pre-existing (retained) vs new build.
  const setExisting = (existing: boolean) => updateShape(wall.id, { existing });

  const alignSwing = (swingDirection: DoorShape["swingDirection"]) => {
    doors.forEach((d) => updateShape(d.id, { swingDirection }));
  };

  const alignHinge = (hingeSide: DoorShape["hingeSide"]) => {
    doors.forEach((d) => updateShape(d.id, { hingeSide }));
  };

  return (
    <>
      {/* Fixed-corner button — stacked above the tools FAB (bottom-right), clear
          of on-canvas dimensions which hug the walls. */}
      <div className="fixed bottom-22 right-4 z-40">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 supports-backdrop-filter:backdrop-blur-xs"
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

            {/* Tabs — arc walls expose properties only (layer takeoff is exact
                only for straight walls). */}
            <div className="flex gap-1 rounded-lg bg-muted p-0.5">
              {(isArc ? (["properties"] as const) : (["properties", "layers"] as const)).map((tabId) => (
                <button
                  key={tabId}
                  onClick={() => setTab(tabId)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    tab === tabId
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tabId === "properties" ? t("wall.properties") : t("wall.layers")}
                </button>
              ))}
            </div>

            {tab === "layers" && wall.type === "wall" ? (
              <WallLayersPanel wall={wall} />
            ) : (
              <>
            {/* Dimensions — shown/entered in the active measurement unit */}
            <div className="flex flex-col gap-2">
              {/* Length / angle — numeric resize & rotate (no precise dragging) */}
              <NumberField
                label={t("wall.length")}
                value={toUnit(lengthPx, unit, ppm)}
                min={stepFor(unit)}
                step={stepFor(unit)}
                suffix={unit}
                onChange={(v) => setLength(v)}
              />
              <NumberField
                label={t("wall.angle")}
                value={Math.round(bearingDeg * 10) / 10}
                min={0}
                step={1}
                suffix="°"
                onChange={(v) => setAngle(v)}
              />
              <NumberField
                label={t("wall.thickness")}
                value={toUnit(wall.thickness, unit, ppm)}
                min={stepFor(unit)}
                step={stepFor(unit)}
                suffix={unit}
                onChange={(v) => setThickness(toPx(v, unit, ppm))}
              />
              <NumberField
                label={t("wall.height")}
                value={toUnit(cmToPx(wall.height ?? defaultWallHeight, ppm), unit, ppm)}
                min={stepFor(unit)}
                step={stepFor(unit)}
                suffix={unit}
                onChange={(v) => setHeight(pxToCm(toPx(v, unit, ppm), ppm))}
              />
              {/* Eccentric offset — signed; shifts the body off the location line. */}
              <NumberField
                label={t("wall.offset")}
                value={toUnit(wall.offset ?? 0, unit, ppm)}
                min={-9999}
                step={stepFor(unit)}
                suffix={unit}
                onChange={(v) => setOffset(toPx(v, unit, ppm))}
              />
              {/* Curvature (sagitta) — arc walls only; signed bulge of the arc. */}
              {wall.type === "arc-wall" && (
                <NumberField
                  label={t("wall.curvature")}
                  value={toUnit(wall.bulge, unit, ppm)}
                  min={-9999}
                  step={stepFor(unit)}
                  suffix={unit}
                  onChange={(v) => setBulge(toPx(v, unit, ppm))}
                />
              )}

              {/* Derived arc dimensions (read-only) — chord, true arc length and
                  depth (rise/sagitta), recomputed live from radius + sweep. */}
              {wall.type === "arc-wall" && (() => {
                const arc = arcFromChordBulge(wall.x1, wall.y1, wall.x2, wall.y2, wall.bulge);
                const chordPx = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
                const arcLenPx = arc ? arc.length : chordPx;
                const depthPx = Math.abs(wall.bulge);
                const rows: [string, number][] = [
                  [t("wall.chord"), chordPx],
                  [t("wall.arcLength"), arcLenPx],
                  [t("wall.depth"), depthPx],
                ];
                return (
                  <div className="mt-1 flex flex-col gap-1 rounded-lg bg-muted/50 p-2">
                    <span className="text-[11px] font-medium text-muted-foreground">{t("wall.arcDimensions")}</span>
                    {rows.map(([label, px]) => (
                      <div key={label} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium tabular-nums">{formatDimension(px, unit, ppm)}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Renovation phase — new build vs pre-existing (retained) wall */}
            <div className="flex flex-col gap-1.5 border-t pt-3">
              <span className="text-[11px] text-muted-foreground">{t("wall.phase")}</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={wall.existing ? "outline" : "default"}
                  className="flex-1"
                  onClick={() => setExisting(false)}
                >
                  {t("wall.new")}
                </Button>
                <Button
                  size="sm"
                  variant={wall.existing ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setExisting(true)}
                >
                  {t("wall.existing")}
                </Button>
              </div>
            </div>

            {/* Opening alignment — only meaningful when doors exist */}
            {doors.length > 0 ? (
              <div className="flex flex-col gap-2 border-t pt-3">
                <span className="text-xs text-muted-foreground">{t("wall.alignDoors", { count: doors.length })}</span>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-muted-foreground">{t("wall.swingSide")}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => alignSwing("inward")}>
                      {t("wall.inward")}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => alignSwing("outward")}>
                      {t("wall.outward")}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-muted-foreground">{t("wall.hingeSide")}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => alignHinge("left")}>
                      {t("wall.left")}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => alignHinge("right")}>
                      {t("wall.right")}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="border-t pt-3 text-[11px] text-muted-foreground">{t("wall.noDoors")}</p>
            )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default WallActions;
