import type { DimensionUnit } from "@/store/editor.store";

export const formatDimension = (px: number, unit: DimensionUnit, pixelsPerMeter: number): string => {
  switch (unit) {
    case "px":
      return `${Math.round(px)}px`;
    case "mm": {
      const mm = (px / pixelsPerMeter) * 1000;
      return `${mm % 1 === 0 ? mm : mm.toFixed(0)}mm`;
    }
    case "cm": {
      const cm = (px / pixelsPerMeter) * 100;
      return `${cm % 1 === 0 ? cm : cm.toFixed(1)}cm`;
    }
    case "m": {
      const m = px / pixelsPerMeter;
      return `${m % 1 === 0 ? m : m.toFixed(2)}m`;
    }
  }
};

/** Inverse of formatDimension's magnitude: convert a value in `unit` back to px. */
export const toPx = (value: number, unit: DimensionUnit, pixelsPerMeter: number): number => {
  switch (unit) {
    case "px":
      return value;
    case "mm":
      return (value / 1000) * pixelsPerMeter;
    case "cm":
      return (value / 100) * pixelsPerMeter;
    case "m":
      return value * pixelsPerMeter;
  }
};

/** The plain numeric magnitude of `px` in `unit` (no suffix) — for input fields. */
export const toUnit = (px: number, unit: DimensionUnit, pixelsPerMeter: number): number => {
  switch (unit) {
    case "px":
      return Math.round(px);
    case "mm":
      return Math.round((px / pixelsPerMeter) * 1000);
    case "cm":
      return Math.round((px / pixelsPerMeter) * 1000) / 10;
    case "m":
      return Math.round((px / pixelsPerMeter) * 100) / 100;
  }
};

/** Format a real-world area (m²) for display. px-mode shows px² instead. */
export const formatArea = (areaM2: number): string =>
  `${areaM2 % 1 === 0 ? areaM2 : areaM2.toFixed(2)} m²`;

/**
 * Wall height is stored in cm (a real-world quantity, never drawn in 2D). These
 * bridge it to/from px so the px-based helpers above can render and parse height
 * in any unit, exactly like a length: cm → px → display, and back.
 */
export const cmToPx = (cm: number, pixelsPerMeter: number): number => (cm / 100) * pixelsPerMeter;
export const pxToCm = (px: number, pixelsPerMeter: number): number => (px / pixelsPerMeter) * 100;

/** A sensible spinner step / minimum for entering a value in the given unit. */
export const stepFor = (unit: DimensionUnit): number =>
  unit === "m" ? 0.01 : unit === "cm" ? 0.1 : 1;
