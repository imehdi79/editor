/**
 * WallLayersPanel — the "Layers" tab of the wall panel: a composite assembly
 * editor.
 *
 * A wall is described as one ordered exterior→interior stack of construction
 * layers. Each row carries a material, its build-up thickness, and a BIM
 * function (its junction priority), plus a marker for the structural-core slice.
 * Layers can be added, removed, reordered (outward/inward) and seeded from a
 * professional preset. Edits write `wall.assembly` / `coreStart` / `coreEnd`
 * (and `thickness` = the core width that dimensions reference) via `updateShape`.
 */

import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/editor.store";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { toPx, toUnit, stepFor } from "@/core/dimensions/dimensionUnits";
import { NumericInput } from "@/components/ui/number-field";
import type { LayerFunction, WallLayer, WallShape } from "@/core/drawing-engine/drawing.types";
import { WALL_MATERIALS, materialColor } from "@/core/wall-layers/wallLayers";
import { wallAssembly, LAYER_FUNCTIONS } from "@/core/wall-layers/wallAssembly";
import { ASSEMBLY_PRESETS, presetToPatch, coreWidth } from "@/core/wall-layers/wallAssemblyPresets";
import { uid } from "@/lib/uid";
import { useTranslation } from "@/i18n";

const INPUT = "h-7 rounded border bg-background px-1.5 outline-none focus-visible:border-ring";

type Row = WallLayer & { isCore: boolean };

const WallLayersPanel = ({ wall }: { wall: WallShape }) => {
  const { t, tf } = useTranslation();
  const unit = useEditorStore((s) => s.dimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const updateShape = useFloorPlanStore((s) => s.updateShape);

  const materialLabel = (name: string) => tf(`materials.${name.toLowerCase()}`, name);

  // Current stack exterior→interior (from explicit assembly or derived legacy).
  const { layers } = wallAssembly(wall);
  const rows: Row[] = layers.map((l) => ({
    id: l.id,
    material: l.material,
    thickness: l.thickness,
    function: l.function,
    isCore: l.isCore,
  }));

  // Commit edited rows → explicit assembly + contiguous core slice + core width.
  const commit = (next: Row[]) => {
    const coreIdx = next.flatMap((r, i) => (r.isCore ? [i] : []));
    const coreStart = coreIdx.length ? Math.min(...coreIdx) : 0;
    const coreEnd = coreIdx.length ? Math.max(...coreIdx) : next.length - 1;
    const assembly: WallLayer[] = next.map((r) => ({
      id: r.id,
      material: r.material,
      thickness: r.thickness,
      function: r.function,
    }));
    updateShape(wall.id, { assembly, coreStart, coreEnd, thickness: coreWidth(assembly, coreStart, coreEnd) });
  };

  const patchRow = (i: number, patch: Partial<Row>) => commit(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addLayer = () =>
    commit([...rows, { id: uid(), material: WALL_MATERIALS[0].name, thickness: 1.5, function: "finish1", isCore: false }]);
  const removeRow = (i: number) => rows.length > 1 && commit(rows.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Preset picker + add */}
      <div className="flex items-center gap-1.5">
        <select
          value=""
          onChange={(e) => {
            const preset = ASSEMBLY_PRESETS.find((p) => p.id === e.target.value);
            if (preset) updateShape(wall.id, presetToPatch(preset));
          }}
          className={`${INPUT} flex-1 text-xs`}
          title={t("wallAssembly.preset")}
        >
          <option value="" disabled>
            {t("wallAssembly.presetPlaceholder")}
          </option>
          {ASSEMBLY_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {tf(`assemblyPresets.${p.id}`, p.id)}
            </option>
          ))}
        </select>
        <Button size="xs" variant="outline" onClick={addLayer}>
          <Plus /> {t("wallAssembly.addLayer")}
        </Button>
      </div>

      <span className="px-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {t("wallAssembly.exterior")} ↓ {t("wallAssembly.interior")}
      </span>

      {/* Layer cards, exterior (top) → interior (bottom) */}
      <div className="flex flex-col gap-1.5">
        {rows.map((row, i) => (
          <div key={row.id} className="flex flex-col gap-1.5 rounded-md border p-1.5 text-[11px]">
            {/* Material + thickness + remove */}
            <div className="flex items-center gap-1.5">
              <span
                className="size-3 shrink-0 rounded-sm border border-black/10"
                style={{ backgroundColor: materialColor(row.material) }}
              />
              <select
                value={row.material}
                onChange={(e) => patchRow(i, { material: e.target.value })}
                className={`${INPUT} min-w-0 flex-1`}
              >
                {!WALL_MATERIALS.some((m) => m.name === row.material) && (
                  <option value={row.material}>{materialLabel(row.material)}</option>
                )}
                {WALL_MATERIALS.map((m) => (
                  <option key={m.name} value={m.name}>
                    {materialLabel(m.name)}
                  </option>
                ))}
              </select>
              <NumericInput
                value={toUnit(row.thickness, unit, ppm)}
                min={stepFor(unit)}
                onChange={(v) => patchRow(i, { thickness: toPx(v, unit, ppm) })}
                className={`${INPUT} w-14 text-right`}
              />
              <span className="w-4 text-muted-foreground">{unit}</span>
              <Button
                size="icon-xs"
                variant="ghost"
                title={t("wallLayers.removeLayer")}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(i)}
              >
                <Trash2 />
              </Button>
            </div>

            {/* Function + core marker + reorder */}
            <div className="flex items-center gap-1.5">
              <select
                value={row.function}
                onChange={(e) => patchRow(i, { function: e.target.value as LayerFunction })}
                className={`${INPUT} min-w-0 flex-1`}
                title={t("wallAssembly.function")}
              >
                {LAYER_FUNCTIONS.map((fn) => (
                  <option key={fn} value={fn}>
                    {t(`layerFunction.${fn}`)}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-muted-foreground" title={t("wallAssembly.core")}>
                <input type="checkbox" checked={row.isCore} onChange={(e) => patchRow(i, { isCore: e.target.checked })} />
                {t("wallAssembly.core")}
              </label>
              <Button
                size="icon-xs"
                variant="ghost"
                disabled={i === 0}
                title={t("wallAssembly.moveOut")}
                onClick={() => move(i, -1)}
              >
                <ChevronUp />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                disabled={i === rows.length - 1}
                title={t("wallAssembly.moveIn")}
                onClick={() => move(i, 1)}
              >
                <ChevronDown />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WallLayersPanel;
