/**
 * WallPropertiesForm — the editable property set for a selected wall / arc wall.
 *
 * Extracted from WallActions so the mobile modal and the desktop inspector render
 * the exact same controls. Properties (length, angle, thickness, height, offset,
 * curvature, renovation phase, opening alignment) and the composite layer stack
 * live behind a two-tab switch. All edits go straight to the floor-plan store.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { toPx, toUnit, cmToPx, pxToCm, stepFor, formatDimension } from "@/core/dimensions/dimensionUnits";
import { absoluteAngleDeg } from "@/core/wall-utils/wallAngles";
import { arcFromChordBulge } from "@/core/arc/arcGeometry";
import type { Shape, WallShape, ArcWallShape, DoorShape } from "@/core/drawing-engine/drawing.types";
import { useTranslation } from "@/i18n";
import { useSetWallThickness } from "@/features/wall-tool/useWallThickness";
import { NumberField } from "@/components/ui/number-field";
import { Button } from "@/components/ui/button";
import WallLayersPanel from "./WallLayersPanel";

/** Wall or arc wall — both carry thickness/height/offset and editable properties. */
export const isWallLike = (s: Shape | undefined): s is WallShape | ArcWallShape =>
  !!s && (s.type === "wall" || s.type === "arc-wall");

type WallTab = "properties" | "layers";

const WallPropertiesForm = ({ wall }: { wall: WallShape | ArcWallShape }) => {
  const { t } = useTranslation();
  const shapes = useFloorPlanStore((s) => s.shapes);
  const updateShape = useFloorPlanStore((s) => s.updateShape);
  const defaultWallHeight = useEditorStore((s) => s.defaultWallHeight);
  const unit = useEditorStore((s) => s.dimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const setWallThickness = useSetWallThickness();

  // Tab resets to "properties" on a new selection because callers mount this
  // with `key={wall.id}` (remount on change) — no effect needed.
  const [tab, setTab] = useState<WallTab>("properties");

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

  // Rotate to an absolute bearing — pivot the midpoint, preserve length.
  const setAngle = (deg: number) => {
    const mx = (wall.x1 + wall.x2) / 2;
    const my = (wall.y1 + wall.y2) / 2;
    const half = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1) / 2;
    const rad = (deg * Math.PI) / 180;
    const ux = Math.cos(rad);
    const uy = -Math.sin(rad);
    updateShape(wall.id, { x1: mx - ux * half, y1: my - uy * half, x2: mx + ux * half, y2: my + uy * half });
  };

  const setThickness = (thickness: number) => setWallThickness(wall.id, thickness);
  const setHeight = (height: number) => updateShape(wall.id, { height });
  const setOffset = (offset: number) => updateShape(wall.id, { offset });
  const setBulge = (bulge: number) => updateShape(wall.id, { bulge });
  const setExisting = (existing: boolean) => updateShape(wall.id, { existing });
  const alignSwing = (swingDirection: DoorShape["swingDirection"]) =>
    doors.forEach((d) => updateShape(d.id, { swingDirection }));
  const alignHinge = (hingeSide: DoorShape["hingeSide"]) =>
    doors.forEach((d) => updateShape(d.id, { hingeSide }));

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs — straight and arc walls both expose the composite layers. */}
      <div className="flex gap-1 rounded-lg bg-muted p-0.5">
        {(["properties", "layers"] as const).map((tabId) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              tab === tabId ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tabId === "properties" ? t("wall.properties") : t("wall.layers")}
          </button>
        ))}
      </div>

      {tab === "layers" ? (
        <WallLayersPanel wall={wall} />
      ) : (
        <>
          <div className="flex flex-col gap-2">
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
            <NumberField
              label={t("wall.offset")}
              value={toUnit(wall.offset ?? 0, unit, ppm)}
              min={-9999}
              step={stepFor(unit)}
              suffix={unit}
              onChange={(v) => setOffset(toPx(v, unit, ppm))}
            />
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

            {wall.type === "arc-wall" &&
              (() => {
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
              <Button size="sm" variant={wall.existing ? "outline" : "default"} className="flex-1" onClick={() => setExisting(false)}>
                {t("wall.new")}
              </Button>
              <Button size="sm" variant={wall.existing ? "default" : "outline"} className="flex-1" onClick={() => setExisting(true)}>
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
  );
};

export default WallPropertiesForm;
