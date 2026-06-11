/**
 * WallActions — a floating action button anchored to the selected wall.
 *
 * Shows only when the select tool is active and a wall is selected. The
 * button is positioned at the wall midpoint, converted from world space to
 * screen space via the viewport transform. Clicking it opens a modal to:
 *   - edit the selected wall's thickness (and keep its hosted openings in sync)
 *   - align all doors/windows on that wall to one direction (so two doors that
 *     open opposite ways can be unified)
 */

import { useState, useEffect } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelectionStore } from "@/store/selection.store";
import { useViewportStore } from "@/store/viewport.store";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useToolsStore } from "@/store/tools.store";
import type { Shape, WallShape, DoorShape } from "@/core/drawing-engine/drawing.types";

const isWall = (s: Shape | undefined): s is WallShape => !!s && s.type === "wall";

const WallActions = () => {
  const tool = useToolsStore((s) => s.tool);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const shapes = useFloorPlanStore((s) => s.shapes);
  const updateShape = useFloorPlanStore((s) => s.updateShape);
  const { x: vx, y: vy, scale } = useViewportStore();

  const [open, setOpen] = useState(false);

  const selected = selectedId ? shapes[selectedId] : undefined;
  const wall = isWall(selected) ? selected : null;

  // Close the modal whenever the selection leaves a wall
  useEffect(() => {
    if (!wall) setOpen(false);
  }, [wall]);

  if (tool !== "select" || !wall) return null;

  // Openings hosted on this wall
  const openings = Object.values(shapes).filter(
    (s) => (s.type === "door" || s.type === "window") && s.wallId === wall.id,
  ) as (DoorShape | Extract<Shape, { type: "window" }>)[];
  const doors = openings.filter((s): s is DoorShape => s.type === "door");

  // Wall midpoint, pushed off the wall along its normal so the button
  // doesn't sit on top of the wall line. Offset scales a little with zoom
  // but is clamped so it stays close at any scale.
  const midWorldX = (wall.x1 + wall.x2) / 2;
  const midWorldY = (wall.y1 + wall.y2) / 2;
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy) || 1;
  // Left-hand normal (canvas y-down)
  const nx = -dy / len;
  const ny = dx / len;
  // Clear the wall half-thickness plus a fixed gap, in world units
  const offsetWorld = wall.thickness / 2 + 22 / scale;
  const screenX = (midWorldX + nx * offsetWorld) * scale + vx;
  const screenY = (midWorldY + ny * offsetWorld) * scale + vy;

  const setThickness = (thickness: number) => {
    updateShape(wall.id, { thickness });
    // Keep hosted openings visually consistent with the wall they cut
    openings.forEach((o) => updateShape(o.id, { thickness }));
  };

  const alignSwing = (swingDirection: DoorShape["swingDirection"]) => {
    doors.forEach((d) => updateShape(d.id, { swingDirection }));
  };

  const alignHinge = (hingeSide: DoorShape["hingeSide"]) => {
    doors.forEach((d) => updateShape(d.id, { hingeSide }));
  };

  return (
    <>
      {/* Floating button at the wall midpoint */}
      <div className="absolute z-40 -translate-x-1/2 -translate-y-1/2" style={{ left: screenX, top: screenY }}>
        <Button
          size="icon-sm"
          variant="default"
          title="Wall actions"
          className="shadow-2xl"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal size={14} />
        </Button>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 supports-backdrop-filter:backdrop-blur-xs"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex w-72 flex-col gap-4 rounded-xl border bg-popover p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Wall</span>
              <Button size="icon-xs" variant="ghost" title="Close" onClick={() => setOpen(false)}>
                <X size={14} />
              </Button>
            </div>

            {/* Thickness */}
            <label className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Thickness</span>
              <span className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={wall.thickness}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isNaN(v) && v >= 1) setThickness(v);
                  }}
                  className="h-7 w-16 rounded-md border bg-background px-2 text-right text-xs outline-none focus-visible:border-ring"
                />
                <span className="w-5 text-muted-foreground">px</span>
              </span>
            </label>

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
          </div>
        </div>
      )}
    </>
  );
};

export default WallActions;
