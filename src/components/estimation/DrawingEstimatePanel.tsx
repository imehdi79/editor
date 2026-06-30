/**
 * DrawingEstimatePanel — costs the live drawing. Shared by the admin Estimate
 * section (drawing mode) and the in-editor estimate panel.
 *
 * Walls are grouped by their per-wall `assemblyId` (falling back to the wall
 * default chosen here). Spaces are FIRST-CLASS, per-room entities: every detected
 * room shows its floor + ceiling, each with its own persisted assembly (or the
 * session default), the resolved cost, and ranked cheaper alternatives. Rooms
 * missing an assembly are flagged — never silently dropped. The chosen
 * job-question answers raise flags for the pricing rules.
 *
 * Per-room picks WRITE to the document (`setSpaceAssembly`, undoable/persisted);
 * geometry stays derived (computeSpaces) and is never duplicated. The wall
 * fallback + answers are local session state.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { useAdminLayersStore, type AdminWallLayer } from "@/store/admin-layers.store";
import { useAdminPricingStore } from "@/store/admin-pricing.store";
import { useAdminQuestionsStore } from "@/store/admin-questions.store";
import { computeSpaces, withAssignments } from "@/core/spaces/computeSpaces";
import { type ElementType } from "@/core/estimation/elementTypes";
import { estimate, type EstimateItem, type ElementMeasure } from "@/core/estimation/estimate";
import {
  wallMeasure,
  addMeasure,
  spaceMeasure,
  buildSpaceItems,
  type AssemblyResolver,
  type SpaceSurface,
} from "@/core/estimation/takeoff";
import { type AssemblyOption, type Pricing } from "@/core/estimation/recommend";
import { EstimateResult } from "./EstimateResult";
import { JobConditions, flagsFromAnswers } from "./JobConditions";
import { AssemblyOptions } from "./AssemblyOptions";
import { FIELD, money, ELEMENT_TYPE_KEY } from "./labels";

const ZERO: ElementMeasure = { area: 0, length: 0, count: 0 };
const SURFACES: SpaceSurface[] = ["floor", "ceiling"];

export const DrawingEstimatePanel = () => {
  const { t } = useTranslation();
  const shapes = useFloorPlanStore((s) => s.shapes);
  const spaceAssignments = useFloorPlanStore((s) => s.spaceAssignments);
  const setSpaceAssembly = useFloorPlanStore((s) => s.setSpaceAssembly);
  const presets = useAdminLayersStore((s) => s.presets);
  const layers = useAdminLayersStore((s) => s.layers);
  const rates = useAdminPricingStore((s) => s.rates);
  const rules = useAdminPricingStore((s) => s.rules);
  const questions = useAdminQuestionsStore((s) => s.questions);
  const pixelsPerMeter = useEditorStore((s) => s.pixelsPerMeter);
  const defaultWallHeight = useEditorStore((s) => s.defaultWallHeight);

  // Session-local: per-type wall fallback + per-surface room defaults + answers.
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
  const resolve: AssemblyResolver = (id) => {
    const ls = resolveLayers(id);
    return ls.length > 0 ? { name: presetName(id), layers: ls } : null;
  };

  // --- Geometry (derived; assignments folded in without re-tracing) ---
  const spaces = withAssignments(computeSpaces(shapes), spaceAssignments);

  // --- Walls: group by per-wall assignment, falling back to the wall default ---
  const wallGroups = new Map<string, ElementMeasure>();
  let wallTotal: ElementMeasure = { ...ZERO };
  for (const s of Object.values(shapes)) {
    if ((s.type !== "wall" && s.type !== "arc-wall") || s.existing) continue;
    const m = wallMeasure(s, opts);
    wallTotal = addMeasure(wallTotal, m);
    const pid = s.assemblyId && presets.some((p) => p.id === s.assemblyId) ? s.assemblyId : defaults.wall;
    if (!pid) continue;
    wallGroups.set(pid, addMeasure(wallGroups.get(pid) ?? { ...ZERO }, m));
  }
  const hasWalls = wallTotal.count > 0;

  const wallItems: EstimateItem[] = [];
  for (const [pid, m] of wallGroups) {
    const ls = resolveLayers(pid);
    if (ls.length > 0) wallItems.push({ name: presetName(pid), layers: ls, measure: m });
  }

  // --- Spaces: per-room floor + ceiling items (+ missing-assembly warnings) ---
  const { items: spaceItems, warnings } = buildSpaceItems(
    spaces,
    { floor: defaults.floor, ceiling: defaults.ceiling },
    resolve,
    pixelsPerMeter,
  );

  const flags = flagsFromAnswers(questions, answers);
  const result = estimate({ items: [...wallItems, ...spaceItems], rates, rules, flags });

  const pricing: Pricing = { rates, rules, flags };
  const optionsFor = (et: ElementType): AssemblyOption[] =>
    presets
      .filter((p) => p.elementType === et)
      .map((p) => ({ id: p.id, name: p.name || t("admin.newPreset"), layers: resolveLayers(p.id) }))
      .filter((o) => o.layers.length > 0);
  const presetOptions = (et: ElementType) => presets.filter((p) => p.elementType === et);
  const surfaceId = (sp: (typeof spaces)[number], surface: SpaceSurface) =>
    surface === "floor" ? sp.floorAssemblyId : sp.ceilingAssemblyId;

  if (!hasWalls && spaces.length === 0) {
    return <p className="rounded-lg bg-panel px-3 py-10 text-center text-sm text-ink-3 hair">{t("admin.noShapes")}</p>;
  }

  return (
    <div className="space-y-4">
      {/* Walls — grouped by per-wall assembly, with a fallback for unassigned walls */}
      {hasWalls && (
        <div className="space-y-1.5 rounded-lg bg-panel p-3 hair">
          <div className="grid grid-cols-[8rem_1fr] items-center gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm text-ink-2">{t(ELEMENT_TYPE_KEY.wall)}</span>
              <span className="text-2xs text-ink-3 mono">{money(wallTotal.area)} m²</span>
            </div>
            <select
              value={defaults.wall ?? ""}
              onChange={(e) => setDefaults((d) => ({ ...d, wall: e.target.value }))}
              aria-label={t(ELEMENT_TYPE_KEY.wall)}
              className={cn(FIELD, "w-full")}
            >
              <option value="">{t("admin.selectPreset")}</option>
              {presetOptions("wall").map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || t("admin.newPreset")}
                </option>
              ))}
            </select>
          </div>
          <AssemblyOptions
            options={optionsFor("wall")}
            measure={wallTotal}
            pricing={pricing}
            currentId={defaults.wall ?? ""}
            onPick={(id) => setDefaults((d) => ({ ...d, wall: id }))}
          />
        </div>
      )}

      {/* Rooms — every space is a first-class entity with its own floor + ceiling */}
      {spaces.length > 0 && (
        <div className="space-y-2.5 rounded-lg bg-panel p-3 hair">
          <span className="text-2xs uppercase tracking-wider text-ink-3 mono">{t("admin.rooms")}</span>

          {/* Defaults applied to any room left unassigned */}
          <div className="grid grid-cols-2 gap-2">
            {SURFACES.map((surface) => (
              <label key={surface} className="flex flex-col gap-1">
                <span className="text-2xs text-ink-3">
                  {t("admin.defaults")} · {t(ELEMENT_TYPE_KEY[surface])}
                </span>
                <select
                  value={defaults[surface] ?? ""}
                  onChange={(e) => setDefaults((d) => ({ ...d, [surface]: e.target.value }))}
                  className={cn(FIELD, "w-full")}
                >
                  <option value="">{t("wall.noAssembly")}</option>
                  {presetOptions(surface).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || t("admin.newPreset")}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {spaces.map((space, i) => {
            const measures = spaceMeasure(space, pixelsPerMeter);
            return (
              <div key={space.id} className="space-y-2 rounded-md bg-panel-2 p-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-2">
                    {t("drawingInfo.types.space")} {i + 1}
                  </span>
                  <span className="text-2xs text-ink-3 mono">{money(measures.floor.area)} m²</span>
                </div>
                {SURFACES.map((surface) => {
                  const assigned = surfaceId(space, surface);
                  return (
                    <div key={surface} className="space-y-1">
                      <div className="grid grid-cols-[4.5rem_1fr] items-center gap-2">
                        <span className="text-2xs uppercase tracking-wider text-ink-3 mono">
                          {t(ELEMENT_TYPE_KEY[surface])}
                        </span>
                        <select
                          value={assigned ?? ""}
                          onChange={(e) => setSpaceAssembly(space.id, surface, e.target.value || undefined)}
                          aria-label={t(ELEMENT_TYPE_KEY[surface])}
                          className={cn(FIELD, "w-full")}
                        >
                          <option value="">{t("admin.selectPreset")}</option>
                          {presetOptions(surface).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name || t("admin.newPreset")}
                            </option>
                          ))}
                        </select>
                      </div>
                      <AssemblyOptions
                        options={optionsFor(surface)}
                        measure={measures[surface]}
                        pricing={pricing}
                        currentId={assigned ?? defaults[surface] ?? ""}
                        onPick={(id) => setSpaceAssembly(space.id, surface, id)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Job conditions — answers raise flags the pricing rules act on */}
      {questions.length > 0 && (
        <div className="rounded-lg bg-panel p-3 hair">
          <JobConditions answers={answers} onChange={(qId, oId) => setAnswers((a) => ({ ...a, [qId]: oId }))} />
        </div>
      )}

      {/* Warnings — rooms with an unpriced surface (never silently dropped) */}
      {warnings.length > 0 && (
        <div className="space-y-1 rounded-lg bg-panel p-3 hair">
          <span className="text-2xs uppercase tracking-wider text-danger mono">{t("admin.missingAssemblies")}</span>
          {warnings.map((w) => (
            <p key={w.spaceId} className="text-xs text-ink-2">
              {t("drawingInfo.types.space")} {w.index}
              <span className="text-ink-3">
                {" — "}
                {w.missing.map((s) => t(ELEMENT_TYPE_KEY[s])).join(", ")}
              </span>
            </p>
          ))}
        </div>
      )}

      {result.items.length > 0 ? (
        <EstimateResult result={result} />
      ) : (
        <p className="rounded-lg bg-panel px-3 py-10 text-center text-sm text-ink-3 hair">{t("admin.pickAssemblies")}</p>
      )}
    </div>
  );
};
