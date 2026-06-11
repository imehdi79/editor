/**
 * SettingsPanel — a sidebar icon button that opens a settings popover.
 * Backed by editor.store: measurement reference, default wall thickness,
 * and default wall height (height is reserved for future area/volume calc;
 * it is not drawn in the 2D view).
 */

import { useState, useRef, useEffect } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorStore, type MeasurementReference } from "@/store/editor.store";

const REFERENCE_OPTIONS: { value: MeasurementReference; label: string }[] = [
  { value: "centerline", label: "Center" },
  { value: "inner", label: "Inner" },
  { value: "outer", label: "Outer" },
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

  const measurementReference = useEditorStore((s) => s.measurementReference);
  const setMeasurementReference = useEditorStore((s) => s.setMeasurementReference);
  const defaultWallThickness = useEditorStore((s) => s.defaultWallThickness);
  const setDefaultWallThickness = useEditorStore((s) => s.setDefaultWallThickness);
  const defaultWallHeight = useEditorStore((s) => s.defaultWallHeight);
  const setDefaultWallHeight = useEditorStore((s) => s.setDefaultWallHeight);

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

          {/* Wall defaults */}
          <div className="flex flex-col gap-2 border-t pt-2">
            <NumberField
              label="Wall thickness"
              value={defaultWallThickness}
              min={1}
              step={1}
              suffix="px"
              onChange={setDefaultWallThickness}
            />
            <NumberField
              label="Wall height"
              value={defaultWallHeight}
              min={1}
              step={1}
              suffix="cm"
              onChange={setDefaultWallHeight}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
