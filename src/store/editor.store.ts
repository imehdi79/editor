import { create } from "zustand";
import type { JoinStyle, EndCap, JunctionAlign, JunctionConfig } from "@/core/wall-junctions";
import { DEFAULT_JUNCTION_CONFIG } from "@/core/wall-junctions";

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

/**
 * DimensionDisplay — which dimension system is drawn. Exclusive by design so
 * the per-segment layer and the running chains never overlap into "spaghetti".
 *
 *   "selection" → only the selected shape's per-segment dimension (clean default
 *                 for mobile; nothing shown until you tap a shape)
 *   "segments"  → every shape's per-segment dimension (DimensionLayerRenderer)
 *   "chains"    → inner/outer running chains only (DimensionChainsRenderer)
 */
export type DimensionDisplay = "selection" | "segments" | "chains";

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

  /** How wall faces resolve at a corner (mitre/butt/bevel/round). */
  wallJoinStyle: JoinStyle;
  /** Sharp-angle threshold: mitre longer than this × half-thickness → bevel. */
  miterLimit: number;
  /** How a free (unconnected) wall end is closed. */
  wallEndCap: EndCap;
  /** Which faces align when two joined walls differ in thickness. */
  junctionAlign: JunctionAlign;

  /**
   * When true (default), moving/resizing a shape drags every other shape that
   * shares an endpoint node along with it (connected nodes stay welded). When
   * false, the grabbed shape moves independently, detaching from its joints.
   */
  linkConnectedNodes: boolean;

  /**
   * Which dimension system to draw. Exclusive (segments vs chains never coexist)
   * to avoid overlapping annotation "spaghetti". Defaults to "segments".
   */
  dimensionDisplay: DimensionDisplay;

  setViewMode: (mode: "2d" | "3d") => void;
  setDimensionUnit: (unit: DimensionUnit) => void;
  setMeasurementReference: (ref: MeasurementReference) => void;
  setDefaultWallThickness: (thickness: number) => void;
  setDefaultWallHeight: (height: number) => void;
  setLinkConnectedNodes: (link: boolean) => void;
  setDimensionDisplay: (mode: DimensionDisplay) => void;
  setWallJoinStyle: (style: JoinStyle) => void;
  setMiterLimit: (limit: number) => void;
  setWallEndCap: (cap: EndCap) => void;
  setJunctionAlign: (align: JunctionAlign) => void;
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
  dimensionDisplay: "segments",

  wallJoinStyle: DEFAULT_JUNCTION_CONFIG.joinStyle,
  miterLimit: DEFAULT_JUNCTION_CONFIG.miterLimit,
  wallEndCap: DEFAULT_JUNCTION_CONFIG.endCap,
  junctionAlign: DEFAULT_JUNCTION_CONFIG.align,

  setViewMode: (mode) => set({ viewMode: mode }),
  setDimensionUnit: (unit) => set({ dimensionUnit: unit }),
  setMeasurementReference: (ref) => set({ measurementReference: ref }),
  setDefaultWallThickness: (thickness) => set({ defaultWallThickness: thickness }),
  setDefaultWallHeight: (height) => set({ defaultWallHeight: height }),
  setLinkConnectedNodes: (link) => set({ linkConnectedNodes: link }),
  setDimensionDisplay: (mode) => set({ dimensionDisplay: mode }),
  setWallJoinStyle: (style) => set({ wallJoinStyle: style }),
  setMiterLimit: (limit) => set({ miterLimit: limit }),
  setWallEndCap: (cap) => set({ wallEndCap: cap }),
  setJunctionAlign: (align) => set({ junctionAlign: align }),
}));

/** Assemble the current junction config from editor settings (for geometry). */
export const selectJunctionConfig = (s: EditorStore): JunctionConfig => ({
  joinStyle: s.wallJoinStyle,
  miterLimit: s.miterLimit,
  endCap: s.wallEndCap,
  align: s.junctionAlign,
});
