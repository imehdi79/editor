/**
 * AdminPage — the standalone admin route (/admin).
 *
 * A two-pane CAD console: a labeled sidebar of admin sections and a content
 * panel for the active one. Sections live in NAV_ITEMS so adding one is a single
 * entry (id + icon + i18n key) plus a branch in AdminContent. Access is gated to
 * admin roles by App; the back button returns to the editor.
 */

import { useState } from "react";
import {
  ArrowLeft,
  DollarSign,
  BadgeCheck,
  Palette,
  Layers3,
  Boxes,
  ClipboardList,
  Percent,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/BrandMark";
import { NumericInput } from "@/components/ui/number-field";
import { Button } from "@/components/ui/button";
import { useRouterStore } from "@/store/router.store";
import { useAuthStore } from "@/store/auth.store";
import { useAdminLayersStore, type AdminWallLayer } from "@/store/admin-layers.store";
import { useAdminPricingStore } from "@/store/admin-pricing.store";
import { useAdminQuestionsStore } from "@/store/admin-questions.store";
import { materialColor } from "@/core/wall-layers/wallLayers";
import { EMPTY_RATE } from "@/core/estimation/rate";
import { UNITS, type Unit } from "@/core/estimation/units";
import { ELEMENT_TYPES, type ElementType } from "@/core/estimation/elementTypes";
import { RULE_TARGETS, type RuleTarget, RULE_EFFECTS, type RuleEffect } from "@/core/estimation/pricingRule";
import type { UserRole } from "@/api/authApi";
import { useTranslation, type TranslationKey } from "@/i18n";

type AdminSection = "pricing" | "rules" | "materials" | "layers" | "presets" | "questions";

const NAV_ITEMS: { id: AdminSection; icon: LucideIcon; key: TranslationKey }[] = [
  { id: "pricing", icon: DollarSign, key: "admin.pricing" },
  { id: "rules", icon: Percent, key: "admin.rules" },
  { id: "materials", icon: Palette, key: "admin.materials" },
  { id: "layers", icon: Layers3, key: "admin.layers" },
  { id: "presets", icon: Boxes, key: "admin.presets" },
  { id: "questions", icon: ClipboardList, key: "admin.questions" },
];

const FIELD = "h-8 rounded-md bg-panel-2 px-2 text-sm text-ink outline-none hair focus-visible:ring-1 focus-visible:ring-brand";
/** Layer / detail row: name, material, unit, thickness, remove. */
const ROW = "grid grid-cols-[1fr_9rem_5rem_7rem_2.25rem] items-center gap-2";
/** Materials row: name, colour, unit, thickness, remove. */
const MATERIAL_ROW = "grid grid-cols-[1fr_3.5rem_5rem_7rem_2.25rem] items-center gap-2 px-3";

/** Unit-of-measure ids → i18n label keys. */
const UNIT_KEY: Record<Unit, TranslationKey> = {
  m2: "units.m2",
  m3: "units.m3",
  ml: "units.ml",
  each: "units.each",
  kg: "units.kg",
};

/** Element-type ids → i18n label keys. */
const ELEMENT_TYPE_KEY: Record<ElementType, TranslationKey> = {
  wall: "elementTypes.wall",
  floor: "elementTypes.floor",
  ceiling: "elementTypes.ceiling",
  roof: "elementTypes.roof",
};

/** Pricing-rule target ids → i18n label keys. */
const RULE_TARGET_KEY: Record<RuleTarget, TranslationKey> = {
  material: "ruleTargets.material",
  labor: "ruleTargets.labor",
  total: "ruleTargets.total",
};

/** Pricing-rule effect ids → i18n label keys. */
const RULE_EFFECT_KEY: Record<RuleEffect, TranslationKey> = {
  percent: "ruleEffects.percent",
  fixed: "ruleEffects.fixed",
};

/** Material picker — options are the materials palette, referenced by id; a
 *  dangling id (its material was deleted) stays selectable as a placeholder. */
const MaterialSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const { tf } = useTranslation();
  const materials = useAdminLayersStore((s) => s.materials);
  const label = (name: string) => tf(`materials.${name.toLowerCase()}`, name);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={FIELD}>
      {!materials.some((m) => m.id === value) && <option value={value}>—</option>}
      {materials.map((m) => (
        <option key={m.id} value={m.id}>
          {label(m.name)}
        </option>
      ))}
    </select>
  );
};

/** Layer picker — options come from the layers catalog; an unknown / not-yet-set
 *  value falls back to a "select a layer" placeholder. */
const LayerSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const { t } = useTranslation();
  const layers = useAdminLayersStore((s) => s.layers);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={FIELD}>
      {!layers.some((l) => l.id === value) && <option value={value}>{t("admin.selectLayer")}</option>}
      {layers.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name || t("admin.layerName")}
        </option>
      ))}
    </select>
  );
};

/** Unit-of-measure picker for a material. */
const UnitSelect = ({ value, onChange }: { value: Unit; onChange: (v: Unit) => void }) => {
  const { t } = useTranslation();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Unit)} aria-label={t("admin.unit")} className={FIELD}>
      {UNITS.map((u) => (
        <option key={u} value={u}>
          {t(UNIT_KEY[u])}
        </option>
      ))}
    </select>
  );
};

/** Building-element picker scoping which element a preset applies to. */
const ElementTypeSelect = ({ value, onChange }: { value: ElementType; onChange: (v: ElementType) => void }) => {
  const { t } = useTranslation();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ElementType)}
      aria-label={t("admin.elementType")}
      className={cn(FIELD, "w-28 shrink-0")}
    >
      {ELEMENT_TYPES.map((et) => (
        <option key={et} value={et}>
          {t(ELEMENT_TYPE_KEY[et])}
        </option>
      ))}
    </select>
  );
};

/** Flag picker — options are the distinct flags raised by question answers; the
 *  current value stays selectable even if no question raises it (yet). */
const FlagSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const { t } = useTranslation();
  const questions = useAdminQuestionsStore((s) => s.questions);
  const flags = [...new Set(questions.flatMap((q) => q.options.map((o) => o.flag)).filter(Boolean))];
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(FIELD, "mono")}>
      {!flags.includes(value) && <option value={value}>{value || t("admin.selectFlag")}</option>}
      {flags.map((f) => (
        <option key={f} value={f}>
          {f}
        </option>
      ))}
    </select>
  );
};

/** Pricing-rule target picker (material / labour / total). */
const TargetSelect = ({ value, onChange }: { value: RuleTarget; onChange: (v: RuleTarget) => void }) => {
  const { t } = useTranslation();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as RuleTarget)}
      aria-label={t("admin.ruleTarget")}
      className={FIELD}
    >
      {RULE_TARGETS.map((rt) => (
        <option key={rt} value={rt}>
          {t(RULE_TARGET_KEY[rt])}
        </option>
      ))}
    </select>
  );
};

/** Pricing-rule effect picker (percentage / fixed amount). */
const EffectSelect = ({ value, onChange }: { value: RuleEffect; onChange: (v: RuleEffect) => void }) => {
  const { t } = useTranslation();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as RuleEffect)}
      aria-label={t("admin.ruleEffect")}
      className={FIELD}
    >
      {RULE_EFFECTS.map((re) => (
        <option key={re} value={re}>
          {t(RULE_EFFECT_KEY[re])}
        </option>
      ))}
    </select>
  );
};

/** Right-aligned thickness field with a trailing "cm" unit. */
const ThicknessField = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex items-center justify-end gap-1">
    <NumericInput value={value} min={0.1} onChange={onChange} className={cn(FIELD, "w-14 text-right")} />
    <span className="w-5 text-xs text-ink-3">cm</span>
  </div>
);

const RemoveButton = ({ title, onClick, className }: { title: string; onClick: () => void; className?: string }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    className={cn(
      "grid size-8 place-items-center rounded-md text-ink-3 transition-colors hover:bg-panel-2 hover:text-danger",
      className,
    )}
  >
    <Trash2 className="size-4" />
  </button>
);

/** Colour chip — resolved from the materials palette by id, or an explicit
 *  `color` override (used by the materials list itself). */
const Swatch = ({ materialId, color }: { materialId?: string; color?: string }) => {
  const materials = useAdminLayersStore((s) => s.materials);
  const bg = color ?? materials.find((m) => m.id === materialId)?.color ?? materialColor("");
  return <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: bg }} />;
};

/**
 * AdminMaterialsSection — the base materials palette. Every material option and
 * swatch colour across layers, details and presets resolves from here. Persists
 * to admin-layers.store (localStorage); not yet consumed by the editor.
 */
const AdminMaterialsSection = () => {
  const { t } = useTranslation();
  const materials = useAdminLayersStore((s) => s.materials);
  const addMaterial = useAdminLayersStore((s) => s.addMaterial);
  const updateMaterial = useAdminLayersStore((s) => s.updateMaterial);
  const removeMaterial = useAdminLayersStore((s) => s.removeMaterial);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{t("admin.materials")}</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-2">{t("admin.materialsIntro")}</p>
        </div>
        <Button size="sm" onClick={addMaterial} className="shrink-0">
          <Plus className="size-4" /> {t("admin.addMaterial")}
        </Button>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg bg-panel hair">
        <div className={cn(MATERIAL_ROW, "border-b bg-panel-2 py-2 text-2xs uppercase tracking-wider text-ink-3 mono")}>
          <span>{t("admin.materialName")}</span>
          <span>{t("admin.color")}</span>
          <span>{t("admin.unit")}</span>
          <span className="text-right">{t("admin.thickness")}</span>
          <span />
        </div>

        {materials.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-ink-3">{t("admin.noMaterials")}</p>
        ) : (
          materials.map((m) => (
            <div key={m.id} className={cn(MATERIAL_ROW, "border-b py-2 last:border-b-0")}>
              <div className="flex min-w-0 items-center gap-2">
                <Swatch color={m.color} />
                <input
                  value={m.name}
                  placeholder={t("admin.materialName")}
                  onChange={(e) => updateMaterial(m.id, { name: e.target.value })}
                  className={cn(FIELD, "min-w-0 flex-1")}
                />
              </div>
              <input
                type="color"
                value={m.color}
                onChange={(e) => updateMaterial(m.id, { color: e.target.value })}
                aria-label={t("admin.color")}
                className="h-8 w-full cursor-pointer rounded-md bg-panel-2 p-0.5 hair"
              />
              <UnitSelect value={m.unit} onChange={(v) => updateMaterial(m.id, { unit: v })} />
              <ThicknessField value={m.thickness} onChange={(v) => updateMaterial(m.id, { thickness: v })} />
              <RemoveButton
                title={t("admin.removeMaterial")}
                onClick={() => removeMaterial(m.id)}
                className="justify-self-end"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * LayerCard — one catalog layer: its own fields (name, material, thickness) plus
 * the N nested details it's built from. Reads its actions straight from the store.
 */
const LayerCard = ({ layer }: { layer: AdminWallLayer }) => {
  const { t } = useTranslation();
  const updateLayer = useAdminLayersStore((s) => s.updateLayer);
  const removeLayer = useAdminLayersStore((s) => s.removeLayer);
  const addLayerDetail = useAdminLayersStore((s) => s.addLayerDetail);
  const updateLayerDetail = useAdminLayersStore((s) => s.updateLayerDetail);
  const removeLayerDetail = useAdminLayersStore((s) => s.removeLayerDetail);

  return (
    <div className="overflow-hidden rounded-lg bg-panel hair">
      <div className={cn(ROW, "border-b bg-panel-2 px-3 py-2")}>
        <div className="flex min-w-0 items-center gap-2">
          <Swatch materialId={layer.materialId} />
          <input
            value={layer.name}
            placeholder={t("admin.layerName")}
            onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
            className={cn(FIELD, "min-w-0 flex-1 bg-panel font-medium")}
          />
        </div>
        <MaterialSelect value={layer.materialId} onChange={(v) => updateLayer(layer.id, { materialId: v })} />
        <UnitSelect value={layer.unit} onChange={(v) => updateLayer(layer.id, { unit: v })} />
        <ThicknessField value={layer.thickness} onChange={(v) => updateLayer(layer.id, { thickness: v })} />
        <RemoveButton title={t("admin.removeLayer")} onClick={() => removeLayer(layer.id)} />
      </div>

      <div className="space-y-2 p-3">
        {layer.details.length === 0 ? (
          <p className="py-2 text-center text-sm text-ink-3">{t("admin.noDetails")}</p>
        ) : (
          layer.details.map((detail) => (
            <div key={detail.id} className={ROW}>
              <div className="flex min-w-0 items-center gap-2">
                <Swatch materialId={detail.materialId} />
                <input
                  value={detail.name}
                  placeholder={t("admin.detailName")}
                  onChange={(e) => updateLayerDetail(layer.id, detail.id, { name: e.target.value })}
                  className={cn(FIELD, "min-w-0 flex-1")}
                />
              </div>
              <MaterialSelect
                value={detail.materialId}
                onChange={(v) => updateLayerDetail(layer.id, detail.id, { materialId: v })}
              />
              <UnitSelect value={detail.unit} onChange={(v) => updateLayerDetail(layer.id, detail.id, { unit: v })} />
              <ThicknessField
                value={detail.thickness}
                onChange={(v) => updateLayerDetail(layer.id, detail.id, { thickness: v })}
              />
              <RemoveButton
                title={t("admin.removeDetail")}
                onClick={() => removeLayerDetail(layer.id, detail.id)}
                className="justify-self-end"
              />
            </div>
          ))
        )}

        <Button size="sm" variant="ghost" onClick={() => addLayerDetail(layer.id)} className="mt-1 h-7 text-ink-2">
          <Plus className="size-4" /> {t("admin.addDetail")}
        </Button>
      </div>
    </div>
  );
};

/**
 * AdminLayersSection — the wall-layer catalog. Each layer is a card carrying its
 * own fields plus the nested details it's built from. Persists to
 * admin-layers.store (localStorage); not yet consumed by the editor.
 */
const AdminLayersSection = () => {
  const { t } = useTranslation();
  const layers = useAdminLayersStore((s) => s.layers);
  const addLayer = useAdminLayersStore((s) => s.addLayer);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{t("admin.layers")}</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-2">{t("admin.layersIntro")}</p>
        </div>
        <Button size="sm" onClick={addLayer} className="shrink-0">
          <Plus className="size-4" /> {t("admin.addLayer")}
        </Button>
      </div>

      {layers.length === 0 ? (
        <p className="mt-5 rounded-lg bg-panel px-3 py-10 text-center text-sm text-ink-3 hair">{t("admin.noLayers")}</p>
      ) : (
        <div className="mt-5 space-y-4">
          {layers.map((layer) => (
            <LayerCard key={layer.id} layer={layer} />
          ))}
        </div>
      )}
    </div>
  );
};

/** Column template for a preset's layer rows (swatch + layer, thickness, remove). */
const PRESET_ROW = "grid grid-cols-[1fr_7rem_2.25rem] items-center gap-2";

/**
 * AdminPresetsSection — categories that group catalog layers. Each preset holds N
 * references to layers from the Layers catalog; its total is the sum of those
 * layers' thicknesses. Persists to admin-layers.store; not consumed by the editor
 * yet.
 */
const AdminPresetsSection = () => {
  const { t } = useTranslation();
  const presets = useAdminLayersStore((s) => s.presets);
  const layers = useAdminLayersStore((s) => s.layers);
  const addPreset = useAdminLayersStore((s) => s.addPreset);
  const renamePreset = useAdminLayersStore((s) => s.renamePreset);
  const setPresetElementType = useAdminLayersStore((s) => s.setPresetElementType);
  const removePreset = useAdminLayersStore((s) => s.removePreset);
  const addPresetLayer = useAdminLayersStore((s) => s.addPresetLayer);
  const updatePresetLayer = useAdminLayersStore((s) => s.updatePresetLayer);
  const removePresetLayer = useAdminLayersStore((s) => s.removePresetLayer);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{t("admin.presets")}</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-2">{t("admin.presetsIntro")}</p>
        </div>
        <Button size="sm" onClick={addPreset} className="shrink-0">
          <Plus className="size-4" /> {t("admin.addPreset")}
        </Button>
      </div>

      {presets.length === 0 ? (
        <p className="mt-5 rounded-lg bg-panel px-3 py-10 text-center text-sm text-ink-3 hair">{t("admin.noPresets")}</p>
      ) : (
        <div className="mt-5 space-y-4">
          {presets.map((preset) => {
            const total = +preset.layers
              .reduce((s, ref) => s + (layers.find((l) => l.id === ref.layerId)?.thickness ?? 0), 0)
              .toFixed(2);
            return (
              <div key={preset.id} className="overflow-hidden rounded-lg bg-panel hair">
                <div className="flex items-center gap-2 border-b bg-panel-2 px-3 py-2">
                  <Boxes className="size-4 shrink-0 text-ink-3" />
                  <input
                    value={preset.name}
                    placeholder={t("admin.newPreset")}
                    onChange={(e) => renamePreset(preset.id, e.target.value)}
                    className={cn(FIELD, "min-w-0 flex-1 bg-panel font-medium")}
                  />
                  <ElementTypeSelect
                    value={preset.elementType}
                    onChange={(v) => setPresetElementType(preset.id, v)}
                  />
                  <span className="shrink-0 text-2xs text-ink-3 mono">
                    {t("admin.total")} {total} cm
                  </span>
                  <RemoveButton title={t("admin.removePreset")} onClick={() => removePreset(preset.id)} />
                </div>

                <div className="space-y-2 p-3">
                  {preset.layers.length === 0 ? (
                    <p className="py-4 text-center text-sm text-ink-3">{t("admin.noLayers")}</p>
                  ) : (
                    preset.layers.map((ref) => {
                      const layer = layers.find((l) => l.id === ref.layerId);
                      return (
                        <div key={ref.id} className={PRESET_ROW}>
                          <div className="flex min-w-0 items-center gap-2">
                            <Swatch materialId={layer?.materialId} />
                            <LayerSelect
                              value={ref.layerId}
                              onChange={(v) => updatePresetLayer(preset.id, ref.id, { layerId: v })}
                            />
                          </div>
                          <span className="text-right text-sm text-ink-2 mono">
                            {layer ? `${layer.thickness} cm` : "—"}
                          </span>
                          <RemoveButton
                            title={t("admin.removeLayer")}
                            onClick={() => removePresetLayer(preset.id, ref.id)}
                            className="justify-self-end"
                          />
                        </div>
                      );
                    })
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => addPresetLayer(preset.id)}
                    className="mt-1 h-7 text-ink-2"
                  >
                    <Plus className="size-4" /> {t("admin.addLayer")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Pricing row: material, unit, material cost, labour cost, total. */
const PRICING_ROW = "grid grid-cols-[1fr_4rem_7rem_7rem_5.5rem] items-center gap-2 px-3";

/**
 * AdminPricingSection — per-material unit rates. Reuses the materials palette as
 * the priced items: each row sets a material + labour cost per the material's
 * unit, summed into an all-in total. Persists to admin-pricing.store; not
 * consumed by the editor yet.
 */
const AdminPricingSection = () => {
  const { t, tf } = useTranslation();
  const materials = useAdminLayersStore((s) => s.materials);
  const rates = useAdminPricingStore((s) => s.rates);
  const setRate = useAdminPricingStore((s) => s.setRate);

  return (
    <div className="max-w-2xl">
      <div>
        <h2 className="text-base font-semibold">{t("admin.pricing")}</h2>
        <p className="mt-1 max-w-xl text-sm text-ink-2">{t("admin.pricingIntro")}</p>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg bg-panel hair">
        <div className={cn(PRICING_ROW, "border-b bg-panel-2 py-2 text-2xs uppercase tracking-wider text-ink-3 mono")}>
          <span>{t("admin.materialName")}</span>
          <span>{t("admin.unit")}</span>
          <span className="text-right">{t("admin.materialCost")}</span>
          <span className="text-right">{t("admin.laborCost")}</span>
          <span className="text-right">{t("admin.total")}</span>
        </div>

        {materials.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-ink-3">{t("admin.noMaterials")}</p>
        ) : (
          materials.map((m) => {
            const rate = rates[m.id] ?? EMPTY_RATE;
            const total = +(rate.material + rate.labor).toFixed(2);
            return (
              <div key={m.id} className={cn(PRICING_ROW, "border-b py-2 last:border-b-0")}>
                <div className="flex min-w-0 items-center gap-2">
                  <Swatch color={m.color} />
                  <span className="truncate text-sm">{tf(`materials.${m.name.toLowerCase()}`, m.name) || "—"}</span>
                </div>
                <span className="text-sm text-ink-2 mono">{t(UNIT_KEY[m.unit])}</span>
                <NumericInput
                  value={rate.material}
                  min={0}
                  onChange={(v) => setRate(m.id, { material: v })}
                  className={cn(FIELD, "w-full text-right")}
                />
                <NumericInput
                  value={rate.labor}
                  min={0}
                  onChange={(v) => setRate(m.id, { labor: v })}
                  className={cn(FIELD, "w-full text-right")}
                />
                <span className="text-right text-sm mono">{total}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/** Pricing-rule row: name, flag, target, effect, amount, remove. */
const RULE_ROW = "grid grid-cols-[1fr_9rem_7rem_8rem_5rem_2.25rem] items-center gap-2 px-3";

/**
 * AdminRulesSection — conditional price modifiers. A rule fires on a question
 * flag and adjusts the material / labour / all-in cost by a percentage or fixed
 * amount. Persists to admin-pricing.store; not consumed by the editor yet.
 */
const AdminRulesSection = () => {
  const { t } = useTranslation();
  const rules = useAdminPricingStore((s) => s.rules);
  const addRule = useAdminPricingStore((s) => s.addRule);
  const updateRule = useAdminPricingStore((s) => s.updateRule);
  const removeRule = useAdminPricingStore((s) => s.removeRule);

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{t("admin.rules")}</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-2">{t("admin.rulesIntro")}</p>
        </div>
        <Button size="sm" onClick={addRule} className="shrink-0">
          <Plus className="size-4" /> {t("admin.addRule")}
        </Button>
      </div>

      {rules.length === 0 ? (
        <p className="mt-5 rounded-lg bg-panel px-3 py-10 text-center text-sm text-ink-3 hair">{t("admin.noRules")}</p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-lg bg-panel hair">
          <div className={cn(RULE_ROW, "border-b bg-panel-2 py-2 text-2xs uppercase tracking-wider text-ink-3 mono")}>
            <span>{t("admin.ruleName")}</span>
            <span>{t("admin.flag")}</span>
            <span>{t("admin.ruleTarget")}</span>
            <span>{t("admin.ruleEffect")}</span>
            <span className="text-right">{t("admin.ruleAmount")}</span>
            <span />
          </div>
          {rules.map((r) => (
            <div key={r.id} className={cn(RULE_ROW, "border-b py-2 last:border-b-0")}>
              <input
                value={r.name}
                placeholder={t("admin.ruleName")}
                onChange={(e) => updateRule(r.id, { name: e.target.value })}
                className={cn(FIELD, "min-w-0")}
              />
              <FlagSelect value={r.flag} onChange={(v) => updateRule(r.id, { flag: v })} />
              <TargetSelect value={r.target} onChange={(v) => updateRule(r.id, { target: v })} />
              <EffectSelect value={r.effect} onChange={(v) => updateRule(r.id, { effect: v })} />
              <NumericInput
                value={r.amount}
                min={0}
                onChange={(v) => updateRule(r.id, { amount: v })}
                className={cn(FIELD, "w-full text-right")}
              />
              <RemoveButton title={t("admin.removeRule")} onClick={() => removeRule(r.id)} className="justify-self-end" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Question answer row: label, flag, remove. */
const QUESTION_ROW = "grid grid-cols-[1fr_10rem_2.25rem] items-center gap-2";

/**
 * AdminQuestionsSection — authors the questions that capture job conditions.
 * Each question is a card: a prompt plus the answers it offers, where an answer
 * may raise a flag for pricing rules to act on. Persists to admin-questions.store;
 * not consumed by the editor yet.
 */
const AdminQuestionsSection = () => {
  const { t } = useTranslation();
  const questions = useAdminQuestionsStore((s) => s.questions);
  const addQuestion = useAdminQuestionsStore((s) => s.addQuestion);
  const updateQuestion = useAdminQuestionsStore((s) => s.updateQuestion);
  const removeQuestion = useAdminQuestionsStore((s) => s.removeQuestion);
  const addOption = useAdminQuestionsStore((s) => s.addOption);
  const updateOption = useAdminQuestionsStore((s) => s.updateOption);
  const removeOption = useAdminQuestionsStore((s) => s.removeOption);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{t("admin.questions")}</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-2">{t("admin.questionsIntro")}</p>
        </div>
        <Button size="sm" onClick={addQuestion} className="shrink-0">
          <Plus className="size-4" /> {t("admin.addQuestion")}
        </Button>
      </div>

      {questions.length === 0 ? (
        <p className="mt-5 rounded-lg bg-panel px-3 py-10 text-center text-sm text-ink-3 hair">
          {t("admin.noQuestions")}
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="overflow-hidden rounded-lg bg-panel hair">
              <div className="flex items-center gap-2 border-b bg-panel-2 px-3 py-2">
                <ClipboardList className="size-4 shrink-0 text-ink-3" />
                <input
                  value={q.text}
                  placeholder={t("admin.questionText")}
                  onChange={(e) => updateQuestion(q.id, e.target.value)}
                  className={cn(FIELD, "min-w-0 flex-1 bg-panel font-medium")}
                />
                <RemoveButton title={t("admin.removeQuestion")} onClick={() => removeQuestion(q.id)} />
              </div>

              <div className="space-y-2 p-3">
                {q.options.length === 0 ? (
                  <p className="py-2 text-center text-sm text-ink-3">{t("admin.noAnswers")}</p>
                ) : (
                  q.options.map((o) => (
                    <div key={o.id} className={QUESTION_ROW}>
                      <input
                        value={o.label}
                        placeholder={t("admin.answerLabel")}
                        onChange={(e) => updateOption(q.id, o.id, { label: e.target.value })}
                        className={cn(FIELD, "min-w-0")}
                      />
                      <input
                        value={o.flag}
                        placeholder={t("admin.flag")}
                        onChange={(e) => updateOption(q.id, o.id, { flag: e.target.value })}
                        className={cn(FIELD, "min-w-0 mono")}
                      />
                      <RemoveButton
                        title={t("admin.removeAnswer")}
                        onClick={() => removeOption(q.id, o.id)}
                        className="justify-self-end"
                      />
                    </div>
                  ))
                )}

                <Button size="sm" variant="ghost" onClick={() => addOption(q.id)} className="mt-1 h-7 text-ink-2">
                  <Plus className="size-4" /> {t("admin.addAnswer")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ROLE_KEY: Record<UserRole, TranslationKey> = {
  user: "roles.user",
  admin: "roles.admin",
  "super-admin": "roles.superAdmin",
};

const AdminContent = ({ section }: { section: AdminSection }) => {
  switch (section) {
    case "pricing":
      return <AdminPricingSection />;
    case "rules":
      return <AdminRulesSection />;
    case "materials":
      return <AdminMaterialsSection />;
    case "layers":
      return <AdminLayersSection />;
    case "presets":
      return <AdminPresetsSection />;
    case "questions":
      return <AdminQuestionsSection />;
  }
};

const AdminPage = () => {
  const { t } = useTranslation();
  const navigate = useRouterStore((s) => s.navigate);
  const role = useAuthStore((s) => s.user?.role);
  const [section, setSection] = useState<AdminSection>("pricing");

  return (
    <div className="flex h-svh w-svw flex-col bg-bg text-ink">
      <header className="flex h-12 shrink-0 items-center gap-2 bg-panel px-2 hair">
        <button
          type="button"
          onClick={() => navigate("editor")}
          className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink hair"
        >
          <ArrowLeft size={15} className="flip-x" />
          <span className="hidden sm:inline">{t("admin.backToEditor")}</span>
        </button>
        <div className="mx-1 h-5 w-px shrink-0 bg-line" />
        <div className="grid size-4.5 place-items-center rounded-sm bg-brand text-brand-foreground">
          <BrandMark className="size-3" />
        </div>
        <span className="text-sm font-semibold tracking-tight">{t("admin.title")}</span>
        <div className="flex-1" />
        {role && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-2xs text-brand mono">
            <BadgeCheck size={12} />
            {t(ROLE_KEY[role]).toUpperCase()}
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-48 shrink-0 flex-col gap-1 bg-panel p-2 hair">
          <span className="px-2 py-1.5 text-2xs uppercase tracking-wider text-ink-3 mono">{t("admin.sections")}</span>
          {NAV_ITEMS.map(({ id, icon: Icon, key }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                section === id ? "bg-brand text-brand-foreground" : "text-ink-2 hover:bg-panel-2 hover:text-ink",
              )}
            >
              <Icon size={15} /> {t(key)}
            </button>
          ))}
        </nav>

        <main className="min-h-0 flex-1 overflow-auto p-6">
          <AdminContent section={section} />
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
