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
import { toPx, toUnit, cmToPx, pxToCm, stepFor } from "@/core/dimensions/dimensionUnits";
import type { Shape, WallShape, DoorShape } from "@/core/drawing-engine/drawing.types";
import WallLayersPanel from "./WallLayersPanel";

const isWall = (s: Shape | undefined): s is WallShape => !!s && s.type === "wall";

type WallTab = "properties" | "layers";

const NumberField = ({
  label,
  value,
  min,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) => (
  <label className="flex items-center justify-between gap-2 text-xs">
    <span className="text-muted-foreground">{label}</span>
    <span className="flex items-center gap-1">
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v) && v >= min) onChange(v);
        }}
        className="h-7 w-16 rounded-md border bg-background px-2 text-right text-xs outline-none focus-visible:border-ring"
      />
      <span className="w-5 text-muted-foreground">{suffix}</span>
    </span>
  </label>
);

const WallActions = () => {
  const tool = useToolsStore((s) => s.tool);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const shapes = useFloorPlanStore((s) => s.shapes);
  const updateShape = useFloorPlanStore((s) => s.updateShape);
  const defaultWallHeight = useEditorStore((s) => s.defaultWallHeight);
  const unit = useEditorStore((s) => s.dimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<WallTab>("properties");

  const selected = selectedId ? shapes[selectedId] : undefined;
  const wall = isWall(selected) ? selected : null;

  // Close the modal whenever the selection leaves a wall
  useEffect(() => {
    if (!wall) setOpen(false);
  }, [wall]);

  // Reset to the first tab each time the panel is opened for a fresh selection
  useEffect(() => {
    if (open) setTab("properties");
  }, [open]);

  if (tool !== "select" || !wall) return null;

  // Openings hosted on this wall
  const openings = Object.values(shapes).filter(
    (s) => (s.type === "door" || s.type === "window") && s.wallId === wall.id,
  ) as (DoorShape | Extract<Shape, { type: "window" }>)[];
  const doors = openings.filter((s): s is DoorShape => s.type === "door");

  const setThickness = (thickness: number) => {
    updateShape(wall.id, { thickness });
    // Keep hosted openings visually consistent with the wall they cut
    openings.forEach((o) => updateShape(o.id, { thickness }));
  };

  const setHeight = (height: number) => updateShape(wall.id, { height });

  const setOffset = (offset: number) => updateShape(wall.id, { offset });

  const alignSwing = (swingDirection: DoorShape["swingDirection"]) => {
    doors.forEach((d) => updateShape(d.id, { swingDirection }));
  };

  const alignHinge = (hingeSide: DoorShape["hingeSide"]) => {
    doors.forEach((d) => updateShape(d.id, { hingeSide }));
  };

  return (
    <>
      {/* Fixed-corner button — bottom-right, clear of the left sidebar and of
          on-canvas dimensions which hug the walls. */}
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          size="icon"
          variant="default"
          title="Wall actions"
          className="shadow-2xl"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal size={16} />
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
              <span className="text-sm font-medium">Wall</span>
              <Button size="icon-xs" variant="ghost" title="Close" onClick={() => setOpen(false)}>
                <X size={14} />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-muted p-0.5">
              {(["properties", "layers"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors",
                    tab === t
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === "layers" ? (
              <WallLayersPanel wall={wall} />
            ) : (
              <>
            {/* Dimensions — shown/entered in the active measurement unit */}
            <div className="flex flex-col gap-2">
              <NumberField
                label="Thickness"
                value={toUnit(wall.thickness, unit, ppm)}
                min={stepFor(unit)}
                step={stepFor(unit)}
                suffix={unit}
                onChange={(v) => setThickness(toPx(v, unit, ppm))}
              />
              <NumberField
                label="Height"
                value={toUnit(cmToPx(wall.height ?? defaultWallHeight, ppm), unit, ppm)}
                min={stepFor(unit)}
                step={stepFor(unit)}
                suffix={unit}
                onChange={(v) => setHeight(pxToCm(toPx(v, unit, ppm), ppm))}
              />
              {/* Eccentric offset — signed; shifts the body off the location line. */}
              <NumberField
                label="Offset"
                value={toUnit(wall.offset ?? 0, unit, ppm)}
                min={-9999}
                step={stepFor(unit)}
                suffix={unit}
                onChange={(v) => setOffset(toPx(v, unit, ppm))}
              />
            </div>

            {/* Opening alignment — only meaningful when doors exist */}
            {doors.length > 0 ? (
              <div className="flex flex-col gap-2 border-t pt-3">
                <span className="text-xs text-muted-foreground">Align doors ({doors.length})</span>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Swing side</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => alignSwing("inward")}>
                      Inward
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => alignSwing("outward")}>
                      Outward
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Hinge side</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => alignHinge("left")}>
                      Left
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => alignHinge("right")}>
                      Right
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="border-t pt-3 text-[11px] text-muted-foreground">No doors on this wall to align.</p>
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
