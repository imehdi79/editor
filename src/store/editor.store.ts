import { create } from "zustand";

/**
 * DimensionUnit — the real-world unit dimensions are displayed/entered in.
 *
 * Metre is the base unit (matching how a CAD app reports drawings); the smaller
 * metric units are derived from it (1 m = 100 cm = 1000 mm). `px` is the raw
 * canvas unit, kept for debugging — it is not offered as a CAD measurement.
 */
export type DimensionUnit = "mm" | "cm" | "m" | "px";

/**
 * MeasurementReference — which face of a wall dimensions are measured from.
 *
 *   "centerline" → measured along the wall axis (the stored x1/y1→x2/y2 line)
 *   "inner"      → measured along the inner faces (room-side / chain interno)
 *   "outer"      → measured along the outer faces (overall / chain esterno)
 *
 * This is the "source of truth" reference for how wall lengths and dimension
 * chains are reported. Geometry stays centerline-based internally; the
 * reference only shifts the measured faces used by the dimension layer.
 */
export type MeasurementReference = "centerline" | "inner" | "outer";

interface EditorStore {
  viewMode: "2d" | "3d";
  snapGrid: number;
  axisAngleThreshold: number;
  snapRadius: number;
  dimensionUnit: DimensionUnit;
  pixelsPerMeter: number;

  /** How wall lengths / dimension chains are referenced (centerline vs faces) */
  measurementReference: MeasurementReference;
  /** Default thickness (px) applied to newly drawn walls */
  defaultWallThickness: number;
  /** Default height (px-equivalent, real units) for walls — not drawn in 2D,
   *  reserved for future area/volume (surface) calculations */
  defaultWallHeight: number;

  /**
   * When true (default), moving/resizing a shape drags every other shape that
   * shares an endpoint node along with it (connected nodes stay welded). When
   * false, the grabbed shape moves independently, detaching from its joints.
   */
  linkConnectedNodes: boolean;

  /**
   * Dimension display mode. When false (default), standing dimensions are
   * contextual — hidden until a shape is selected (then only that shape's
   * dimension shows), which keeps the canvas readable on mobile. When true,
   * every wall's per-segment dimensions and the inner/outer running chains are
   * drawn at once (the full CAD annotation sheet).
   */
  showAllDimensions: boolean;

  setViewMode: (mode: "2d" | "3d") => void;
  setDimensionUnit: (unit: DimensionUnit) => void;
  setMeasurementReference: (ref: MeasurementReference) => void;
  setDefaultWallThickness: (thickness: number) => void;
  setDefaultWallHeight: (height: number) => void;
  setLinkConnectedNodes: (link: boolean) => void;
  setShowAllDimensions: (show: boolean) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  viewMode: "2d",
  snapGrid: 0.5,
  axisAngleThreshold: 3,
  snapRadius: window.matchMedia("(pointer: coarse)").matches ? 16 : 6,
  dimensionUnit: "m",
  pixelsPerMeter: 100,

  measurementReference: "centerline",
  defaultWallThickness: 12,
  defaultWallHeight: 280,
  linkConnectedNodes: true,
  showAllDimensions: false,

  setViewMode: (mode) => set({ viewMode: mode }),
  setDimensionUnit: (unit) => set({ dimensionUnit: unit }),
  setMeasurementReference: (ref) => set({ measurementReference: ref }),
  setDefaultWallThickness: (thickness) => set({ defaultWallThickness: thickness }),
  setDefaultWallHeight: (height) => set({ defaultWallHeight: height }),
  setLinkConnectedNodes: (link) => set({ linkConnectedNodes: link }),
  setShowAllDimensions: (show) => set({ showAllDimensions: show }),
}));
