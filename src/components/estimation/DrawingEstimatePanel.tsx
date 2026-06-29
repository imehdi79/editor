/**
 * DrawingEstimatePanel — costs the live drawing. Shared by the admin Estimate
 * section (drawing mode) and the in-editor estimate panel.
 *
 * Measures the current shapes + enclosed spaces, then bills each element type:
 * walls are grouped by their per-wall `assemblyId` (falling back to the wall
 * default chosen here), and spaces feed the floor + ceiling defaults. The chosen
 * job-question answers raise flags for the pricing rules. Read-only — it owns
 * only its local selections and writes nothing to the document.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { useAdminLayersStore, type AdminWallLayer } from "@/store/admin-layers.store";
import { useAdminPricingStore } from "@/store/admin-pricing.store";
import { useAdminQuestionsStore } from "@/store/admin-questions.store";
import { computeSpaces } from "@/core/spaces/computeSpaces";
import { ELEMENT_TYPES } from "@/core/estimation/elementTypes";
import { estimate, type EstimateItem, type ElementMeasure } from "@/core/estimation/estimate";
import { measureDrawing, wallMeasure, addMeasure } from "@/core/estimation/takeoff";
import { EstimateResult } from "./EstimateResult";
import { JobConditions, flagsFromAnswers } from "./JobConditions";
import { FIELD, money, ELEMENT_TYPE_KEY } from "./labels";

export const DrawingEstimatePanel = () => {
  const { t } = useTranslation();
  const shapes = useFloorPlanStore((s) => s.shapes);
  const presets = useAdminLayersStore((s) => s.presets);
  const layers = useAdminLayersStore((s) => s.layers);
  const rates = useAdminPricingStore((s) => s.rates);
  const rules = useAdminPricingStore((s) => s.rules);
  const questions = useAdminQuestionsStore((s) => s.questions);
  const pixelsPerMeter = useEditorStore((s) => s.pixelsPerMeter);
  const defaultWallHeight = useEditorStore((s) => s.defaultWallHeight);

  // Per-type fallback assembly + answered conditions are the only local state.
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const opts = { pixelsPerMeter, defaultWallHeight };
  const resolveLayers = (id: string): AdminWallLayer[] => {
    const p = presets.find((x) => x.id === id);
    return p
      ? p.layers.map((ref) => layers.find((l) => l.id === ref.layerId)).filter((l): l is AdminWallLayer => Boolean(l))
      : [];
  };
  const presetName = (id: string) => presets.find((p) => p.id === id)?.name || t("admin.newPreset");

  const measures = measureDrawing(shapes, computeSpaces(shapes), opts);
  const drawnTypes = ELEMENT_TYPES.filter((et) => measures[et].count > 0);

  // Walls: group by per-wall assignment, falling back to the wall default.
  const wallGroups = new Map<string, ElementMeasure>();
  for (const s of Object.values(shapes)) {
    if ((s.type !== "wall" && s.type !== "arc-wall") || s.existing) continue;
    const pid = s.assemblyId && presets.some((p) => p.id === s.assemblyId) ? s.assemblyId : defaults.wall;
    if (!pid) continue;
    wallGroups.set(pid, addMeasure(wallGroups.get(pid) ?? { area: 0, length: 0, count: 0 }, wallMeasure(s, opts)));
  }

  const items: EstimateItem[] = [];
  for (const [pid, m] of wallGroups) {
    const ls = resolveLayers(pid);
    if (ls.length > 0) items.push({ name: presetName(pid), layers: ls, measure: m });
  }
  for (const et of ["floor", "ceiling"] as const) {
    const pid = defaults[et];
    if (!pid || measures[et].count === 0) continue;
    const ls = resolveLayers(pid);
    if (ls.length > 0) items.push({ name: et, layers: ls, measure: measures[et] });
  }

  const flags = flagsFromAnswers(questions, answers);
  const result = estimate({ items, rates, rules, flags });

  if (drawnTypes.length === 0) {
    return <p className="rounded-lg bg-panel px-3 py-10 text-center text-sm text-ink-3 hair">{t("admin.noShapes")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg bg-panel p-3 hair">
        {drawnTypes.map((et) => (
          <div key={et} className="grid grid-cols-[8rem_1fr] items-center gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm text-ink-2">{t(ELEMENT_TYPE_KEY[et])}</span>
              <span className="text-2xs text-ink-3 mono">{money(measures[et].area)} m²</span>
            </div>
            <select
              value={defaults[et] ?? ""}
              onChange={(e) => setDefaults((d) => ({ ...d, [et]: e.target.value }))}
              aria-label={t(ELEMENT_TYPE_KEY[et])}
              className={cn(FIELD, "w-full")}
            >
              <option value="">{t("admin.selectPreset")}</option>
              {presets
                .filter((p) => p.elementType === et)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || t("admin.newPreset")}
                  </option>
                ))}
            </select>
          </div>
        ))}
        <JobConditions answers={answers} onChange={(qId, oId) => setAnswers((a) => ({ ...a, [qId]: oId }))} />
      </div>

      {result.items.length > 0 ? (
        <EstimateResult result={result} />
      ) : (
        <p className="rounded-lg bg-panel px-3 py-10 text-center text-sm text-ink-3 hair">{t("admin.pickAssemblies")}</p>
      )}
    </div>
  );
};
