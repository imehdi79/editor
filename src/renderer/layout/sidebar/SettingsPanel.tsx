/**
 * SettingsPanel — a sidebar icon button that opens a settings modal.
 * Uses the same centered-modal pattern as WallActions. Backed by editor.store:
 * measurement reference, default wall thickness, and default wall height
 * (height is reserved for future area/volume calc; it is not drawn in 2D).
 * The language switcher writes the active locale to i18n.store.
 */

import { useState } from "react";
import { Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorStore, type DimensionUnit, type MeasurementReference, type DimensionDisplay } from "@/store/editor.store";
import type { JoinStyle, EndCap, JunctionAlign } from "@/core/wall-junctions";
import { toPx, toUnit, cmToPx, pxToCm, stepFor } from "@/core/dimensions/dimensionUnits";
import { NumberField } from "@/components/ui/number-field";
import { ASSEMBLY_PRESETS } from "@/core/wall-layers/wallAssemblyPresets";
import { useTranslation, type TranslationKey } from "@/i18n";
import { useI18nStore } from "@/store/i18n.store";
import { LOCALES, LOCALE_META } from "@/i18n/config";

/** Measurement-reference options — value + the i18n key for its label. */
const REFERENCE_OPTIONS = [
  { value: "centerline", key: "reference.center" },
  { value: "inner", key: "reference.inner" },
  { value: "outer", key: "reference.outer" },
  { value: "core", key: "reference.core" },
] satisfies { value: MeasurementReference; key: TranslationKey }[];

/** CAD-style metric units (SI symbols — language-neutral, not translated). */
const UNIT_OPTIONS: { value: DimensionUnit; label: string }[] = [
  { value: "mm", label: "mm" },
  { value: "cm", label: "cm" },
  { value: "m", label: "m" },
];

const DIMENSION_OPTIONS = [
  { value: "segments", key: "dimensionDisplay.segments" },
  { value: "chains", key: "dimensionDisplay.chains" },
  { value: "both", key: "dimensionDisplay.both" },
] satisfies { value: DimensionDisplay; key: TranslationKey }[];

const JOIN_OPTIONS = [
  { value: "miter", key: "joinStyle.miter" },
  { value: "butt", key: "joinStyle.butt" },
  { value: "bevel", key: "joinStyle.bevel" },
  { value: "round", key: "joinStyle.round" },
] satisfies { value: JoinStyle; key: TranslationKey }[];

const END_CAP_OPTIONS = [
  { value: "butt", key: "endCap.butt" },
  { value: "round", key: "endCap.round" },
  { value: "square", key: "endCap.square" },
] satisfies { value: EndCap; key: TranslationKey }[];

const ALIGN_OPTIONS = [
  { value: "flush-left", key: "align.left" },
  { value: "centered", key: "align.center" },
  { value: "flush-right", key: "align.right" },
] satisfies { value: JunctionAlign; key: TranslationKey }[];

/** A labelled row of mutually-exclusive option buttons. */
const OptionRow = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs text-muted-foreground">{label}</span>
    <div className="flex gap-1">
      {options.map((opt) => (
        <Button
          key={opt.value}
          size="sm"
          variant={value === opt.value ? "default" : "outline"}
          className="flex-1 px-0"
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  </div>
);

interface SettingsPanelProps {
  /** Controlled open state. Omit to use the internal state + icon trigger. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide the built-in icon trigger (when an external control opens the panel). */
  hideTrigger?: boolean;
}

const SettingsPanel = ({ open: openProp, onOpenChange, hideTrigger }: SettingsPanelProps) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const { t, tf } = useTranslation();

  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);

  const dimensionUnit = useEditorStore((s) => s.dimensionUnit);
  const setDimensionUnit = useEditorStore((s) => s.setDimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const measurementReference = useEditorStore((s) => s.measurementReference);
  const setMeasurementReference = useEditorStore((s) => s.setMeasurementReference);
  const defaultWallThickness = useEditorStore((s) => s.defaultWallThickness);
  const setDefaultWallThickness = useEditorStore((s) => s.setDefaultWallThickness);
  const defaultWallHeight = useEditorStore((s) => s.defaultWallHeight);
  const setDefaultWallHeight = useEditorStore((s) => s.setDefaultWallHeight);
  const defaultAssemblyPreset = useEditorStore((s) => s.defaultAssemblyPreset);
  const setDefaultAssemblyPreset = useEditorStore((s) => s.setDefaultAssemblyPreset);
  const linkConnectedNodes = useEditorStore((s) => s.linkConnectedNodes);
  const setLinkConnectedNodes = useEditorStore((s) => s.setLinkConnectedNodes);
  const dimensionDisplay = useEditorStore((s) => s.dimensionDisplay);
  const setDimensionDisplay = useEditorStore((s) => s.setDimensionDisplay);
  const wallJoinStyle = useEditorStore((s) => s.wallJoinStyle);
  const setWallJoinStyle = useEditorStore((s) => s.setWallJoinStyle);
  const miterLimit = useEditorStore((s) => s.miterLimit);
  const setMiterLimit = useEditorStore((s) => s.setMiterLimit);
  const wallEndCap = useEditorStore((s) => s.wallEndCap);
  const setWallEndCap = useEditorStore((s) => s.setWallEndCap);
  const junctionAlign = useEditorStore((s) => s.junctionAlign);
  const setJunctionAlign = useEditorStore((s) => s.setJunctionAlign);

  // Resolve an option list's i18n keys to labels for the active locale.
  const labelled = <T extends string>(opts: readonly { value: T; key: TranslationKey }[]) =>
    opts.map((o) => ({ value: o.value, label: t(o.key) }));

  const languageOptions = LOCALES.map((l) => ({ value: l, label: LOCALE_META[l].label }));

  return (
    <>
      {!hideTrigger && (
        <Button
          size="icon"
          variant={open ? "default" : "ghost"}
          title={t("settings.title")}
          onClick={() => setOpen(!open)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <Settings2 size={16} />
        </Button>
      )}

      {/* Modal — same centered-overlay pattern as WallActions */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 supports-backdrop-filter:backdrop-blur-xs"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-[min(94vw,22rem)] flex-col gap-3 overflow-y-auto rounded-xl border bg-popover p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("settings.title")}</span>
              <Button size="icon-xs" variant="ghost" title={t("common.close")} onClick={() => setOpen(false)}>
                <X size={14} />
              </Button>
            </div>

            {/* Language — native names, not translated */}
            <OptionRow label={t("language.label")} value={locale} options={languageOptions} onChange={setLocale} />

            {/* Unit of measurement — metre is the base unit; cm/mm derive from it */}
            <OptionRow
              label={t("settings.units")}
              value={dimensionUnit}
              options={UNIT_OPTIONS}
              onChange={setDimensionUnit}
            />

            {/* Measurement reference */}
            <OptionRow
              label={t("settings.measurementReference")}
              value={measurementReference}
              options={labelled(REFERENCE_OPTIONS)}
              onChange={setMeasurementReference}
            />

            {/* Dimensions display — per-segment, running chains, or both together. */}
            <div className="border-t pt-2">
              <OptionRow
                label={t("settings.dimensions")}
                value={dimensionDisplay}
                options={labelled(DIMENSION_OPTIONS)}
                onChange={setDimensionDisplay}
              />
            </div>

            {/* Connected-node move behavior */}
            <div className="flex flex-col gap-1.5 border-t pt-2">
              <span className="text-xs text-muted-foreground">{t("settings.moveConnectedNodes")}</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={linkConnectedNodes ? "default" : "outline"}
                  className="flex-1 px-0"
                  onClick={() => setLinkConnectedNodes(true)}
                >
                  {t("settings.together")}
                </Button>
                <Button
                  size="sm"
                  variant={!linkConnectedNodes ? "default" : "outline"}
                  className="flex-1 px-0"
                  onClick={() => setLinkConnectedNodes(false)}
                >
                  {t("settings.separate")}
                </Button>
              </div>
            </div>

            {/* Wall defaults — shown/entered in the active measurement unit */}
            <div className="flex flex-col gap-2 border-t pt-2">
              <NumberField
                label={t("settings.wallThickness")}
                value={toUnit(defaultWallThickness, dimensionUnit, ppm)}
                min={stepFor(dimensionUnit)}
                step={stepFor(dimensionUnit)}
                suffix={dimensionUnit}
                onChange={(v) => setDefaultWallThickness(toPx(v, dimensionUnit, ppm))}
              />
              <NumberField
                label={t("settings.wallHeight")}
                value={toUnit(cmToPx(defaultWallHeight, ppm), dimensionUnit, ppm)}
                min={stepFor(dimensionUnit)}
                step={stepFor(dimensionUnit)}
                suffix={dimensionUnit}
                onChange={(v) => setDefaultWallHeight(pxToCm(toPx(v, dimensionUnit, ppm), ppm))}
              />
              {/* Default composite assembly applied to newly drawn walls. */}
              <label className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{t("settings.defaultAssembly")}</span>
                <select
                  value={defaultAssemblyPreset ?? "none"}
                  onChange={(e) => setDefaultAssemblyPreset(e.target.value === "none" ? null : e.target.value)}
                  className="h-7 rounded-md border bg-background px-1.5 text-xs outline-none focus-visible:border-ring"
                >
                  <option value="none">{tf("assemblyPresets.none", "Single layer")}</option>
                  {ASSEMBLY_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {tf(`assemblyPresets.${p.id}`, p.id)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Wall joins — how wall bodies resolve where they meet. */}
            <div className="flex flex-col gap-2 border-t pt-2">
              <OptionRow label={t("settings.wallJoin")} value={wallJoinStyle} options={labelled(JOIN_OPTIONS)} onChange={setWallJoinStyle} />
              <OptionRow label={t("settings.freeEnd")} value={wallEndCap} options={labelled(END_CAP_OPTIONS)} onChange={setWallEndCap} />
              <OptionRow label={t("settings.thicknessAlign")} value={junctionAlign} options={labelled(ALIGN_OPTIONS)} onChange={setJunctionAlign} />
              <NumberField
                label={t("settings.miterLimit")}
                value={miterLimit}
                min={1}
                step={0.5}
                suffix="×"
                onChange={setMiterLimit}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsPanel;
