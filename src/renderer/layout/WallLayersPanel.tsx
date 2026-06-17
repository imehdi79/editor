/**
 * WallLayersPanel — the "Layers" tab of the wall panel.
 *
 * Lets a wall be described the way it's actually built: a stack of construction
 * layers (brick, plaster, ...) on each face. Both faces are independent, so the
 * inner and outer build-ups can differ. Layers are takeoff data only — they are
 * never drawn or dimensioned on the canvas; here they're shown as a compact
 * table mirroring the drawing-info columns (Type / Length / Width / Height /
 * Area). Length & Height are inherited from the wall (read-only); Type and Width
 * (the layer's own thickness) are editable; Area is the covered wall surface.
 */

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/editor.store";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { toPx, stepFor } from "@/core/dimensions/dimensionUnits";
import type { WallLayer, WallShape, WallSide } from "@/core/drawing-engine/drawing.types";
import { buildWallLayerRows } from "@/core/wall-layers/buildWallLayerRows";
import {
  WALL_SIDES,
  WALL_SIDE_LABEL,
  WALL_MATERIALS,
  materialColor,
  createWallLayer,
  layersOf,
  withSideLayers,
} from "@/core/wall-layers/wallLayers";

const SideTable = ({ wall, side }: { wall: WallShape; side: WallSide }) => {
  const unit = useEditorStore((s) => s.dimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const defaultWallHeight = useEditorStore((s) => s.defaultWallHeight);
  const updateShape = useFloorPlanStore((s) => s.updateShape);

  const rows = buildWallLayerRows(wall, side, unit, ppm, defaultWallHeight);

  const commit = (next: WallLayer[]) =>
    updateShape(wall.id, { layers: withSideLayers(wall, side, next) });

  const addLayer = () => commit([...layersOf(wall, side), createWallLayer()]);
  const removeLayer = (id: string) => commit(layersOf(wall, side).filter((l) => l.id !== id));
  const patchLayer = (id: string, patch: Partial<WallLayer>) =>
    commit(layersOf(wall, side).map((l) => (l.id === id ? { ...l, ...patch } : l)));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">{WALL_SIDE_LABEL[side]}</span>
        <Button size="xs" variant="outline" onClick={addLayer}>
          <Plus /> Layer
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed py-2 text-center text-[11px] text-muted-foreground">
          No layers.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border text-[11px]">
          {/* Header — mirrors the drawing-info table columns */}
          <div className="grid grid-cols-[1fr_3rem_3.25rem_3rem_3.5rem_1.25rem] gap-1 border-b bg-muted/50 px-1.5 py-1 font-medium text-muted-foreground">
            <span>Type</span>
            <span className="text-right">Length</span>
            <span className="text-right">Width</span>
            <span className="text-right">Height</span>
            <span className="text-right">Area</span>
            <span />
          </div>

          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_3rem_3.25rem_3rem_3.5rem_1.25rem] items-center gap-1 border-b px-1.5 py-1 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className="size-3 shrink-0 rounded-sm border border-black/10"
                  style={{ backgroundColor: materialColor(row.material) }}
                />
                <select
                  value={row.material}
                  onChange={(e) => patchLayer(row.id, { material: e.target.value })}
                  className="h-6 w-full min-w-0 rounded border bg-background px-1 outline-none focus-visible:border-ring"
                >
                  {!WALL_MATERIALS.some((m) => m.name === row.material) && (
                    <option value={row.material}>{row.material}</option>
                  )}
                  {WALL_MATERIALS.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <span className="truncate text-right text-muted-foreground">{row.lengthDisplay}</span>
              <input
                type="number"
                min={0}
                step={stepFor(unit)}
                value={row.thicknessValue}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v) && v >= 0) patchLayer(row.id, { thickness: toPx(v, unit, ppm) });
                }}
                className="h-6 w-full rounded border bg-background px-1 text-right outline-none focus-visible:border-ring"
              />
              <span className="truncate text-right text-muted-foreground">{row.heightDisplay}</span>
              <span className="truncate text-right text-muted-foreground">{row.areaDisplay}</span>
              <Button
                size="icon-xs"
                variant="ghost"
                title="Remove layer"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeLayer(row.id)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const WallLayersPanel = ({ wall }: { wall: WallShape }) => (
  <div className="flex flex-col gap-3">
    {WALL_SIDES.map((side) => (
      <SideTable key={side} wall={wall} side={side} />
    ))}
  </div>
);

export default WallLayersPanel;
