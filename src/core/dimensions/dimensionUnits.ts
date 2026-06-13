import type { DimensionUnit } from "@/store/editor.store";

export const formatDimension = (px: number, unit: DimensionUnit, pixelsPerMeter: number): string => {
  switch (unit) {
    case "px":
      return `${Math.round(px)}px`;
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
    case "cm":
      return Math.round((px / pixelsPerMeter) * 1000) / 10;
    case "m":
      return Math.round((px / pixelsPerMeter) * 100) / 100;
  }
};

/** Format a real-world area (m²) for display. px-mode shows px² instead. */
export const formatArea = (areaM2: number): string =>
  `${areaM2 % 1 === 0 ? areaM2 : areaM2.toFixed(2)} m²`;
