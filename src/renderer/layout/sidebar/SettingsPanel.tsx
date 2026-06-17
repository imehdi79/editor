/**
 * SettingsPanel — a sidebar icon button that opens a settings popover.
 * Backed by editor.store: measurement reference, default wall thickness,
 * and default wall height (height is reserved for future area/volume calc;
 * it is not drawn in the 2D view).
 */

import { useState, useRef, useEffect } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorStore, type DimensionUnit, type MeasurementReference, type DimensionDisplay } from "@/store/editor.store";
import { toPx, toUnit, cmToPx, pxToCm, stepFor } from "@/core/dimensions/dimensionUnits";

const REFERENCE_OPTIONS: { value: MeasurementReference; label: string }[] = [
  { value: "centerline", label: "Center" },
  { value: "inner", label: "Inner" },
  { value: "outer", label: "Outer" },
];

/** CAD-style metric units, base unit (m) last so it reads small → large. */
const UNIT_OPTIONS: { value: DimensionUnit; label: string }[] = [
  { value: "mm", label: "mm" },
  { value: "cm", label: "cm" },
  { value: "m", label: "m" },
];

const DIMENSION_OPTIONS: { value: DimensionDisplay; label: string }[] = [
  { value: "selection", label: "Select" },
  { value: "segments", label: "Segments" },
  { value: "chains", label: "Chains" },
];

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

const SettingsPanel = () => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const dimensionUnit = useEditorStore((s) => s.dimensionUnit);
  const setDimensionUnit = useEditorStore((s) => s.setDimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const measurementReference = useEditorStore((s) => s.measurementReference);
  const setMeasurementReference = useEditorStore((s) => s.setMeasurementReference);
  const defaultWallThickness = useEditorStore((s) => s.defaultWallThickness);
  const setDefaultWallThickness = useEditorStore((s) => s.setDefaultWallThickness);
  const defaultWallHeight = useEditorStore((s) => s.defaultWallHeight);
  const setDefaultWallHeight = useEditorStore((s) => s.setDefaultWallHeight);
  const linkConnectedNodes = useEditorStore((s) => s.linkConnectedNodes);
  const setLinkConnectedNodes = useEditorStore((s) => s.setLinkConnectedNodes);
  const dimensionDisplay = useEditorStore((s) => s.dimensionDisplay);
  const setDimensionDisplay = useEditorStore((s) => s.setDimensionDisplay);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        size="icon"
        variant={open ? "default" : "ghost"}
        title="Settings"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Settings2 size={16} />
      </Button>

      {open && (
        <div className="absolute left-full top-0 ml-2 z-50 flex w-56 flex-col gap-3 rounded-lg border bg-popover p-3 shadow-2xl">
          {/* Unit of measurement — metre is the base unit; cm/mm derive from it */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Units</span>
            <div className="flex gap-1">
              {UNIT_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={dimensionUnit === opt.value ? "default" : "outline"}
                  className="flex-1 px-0"
                  onClick={() => setDimensionUnit(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Measurement reference */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Measurement reference</span>
            <div className="flex gap-1">
              {REFERENCE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={measurementReference === opt.value ? "default" : "outline"}
                  className="flex-1 px-0"
                  onClick={() => setMeasurementReference(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Dimensions display — exactly one system (segments OR chains, or just
              the selected shape). Never both, to avoid overlapping annotations. */}
          <div className="flex flex-col gap-1.5 border-t pt-2">
            <span className="text-xs text-muted-foreground">Dimensions</span>
            <div className="flex gap-1">
              {DIMENSION_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={dimensionDisplay === opt.value ? "default" : "outline"}
                  className="flex-1 px-0"
                  onClick={() => setDimensionDisplay(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Connected-node move behavior */}
          <div className="flex flex-col gap-1.5 border-t pt-2">
            <span className="text-xs text-muted-foreground">Move connected nodes</span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={linkConnectedNodes ? "default" : "outline"}
                className="flex-1 px-0"
                onClick={() => setLinkConnectedNodes(true)}
              >
                Together
              </Button>
              <Button
                size="sm"
                variant={!linkConnectedNodes ? "default" : "outline"}
                className="flex-1 px-0"
                onClick={() => setLinkConnectedNodes(false)}
              >
                Separate
              </Button>
            </div>
          </div>

          {/* Wall defaults — shown/entered in the active measurement unit */}
          <div className="flex flex-col gap-2 border-t pt-2">
            <NumberField
              label="Wall thickness"
              value={toUnit(defaultWallThickness, dimensionUnit, ppm)}
              min={stepFor(dimensionUnit)}
              step={stepFor(dimensionUnit)}
              suffix={dimensionUnit}
              onChange={(v) => setDefaultWallThickness(toPx(v, dimensionUnit, ppm))}
            />
            <NumberField
              label="Wall height"
              value={toUnit(cmToPx(defaultWallHeight, ppm), dimensionUnit, ppm)}
              min={stepFor(dimensionUnit)}
              step={stepFor(dimensionUnit)}
              suffix={dimensionUnit}
              onChange={(v) => setDefaultWallHeight(pxToCm(toPx(v, dimensionUnit, ppm), ppm))}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
