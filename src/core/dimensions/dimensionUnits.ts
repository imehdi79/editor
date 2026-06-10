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
