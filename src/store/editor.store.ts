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
 *   "inner"      → measured along the inner FINISHED faces (room-side clear)
 *   "outer"      → measured along the outer FINISHED faces (overall)
 *   "core"       → measured along the structural-core faces (the structural slab,
 *                  excluding finish layers); equals inner/outer on a plain wall
 *
 * This is the "source of truth" reference for how wall lengths and dimension
 * chains are reported. Geometry stays centerline-based internally; the
 * reference only shifts the measured faces used by the dimension layer.
 */
export type MeasurementReference = "centerline" | "inner" | "outer" | "core";

/**
 * DimensionDisplay — which dimension system is drawn.
 *
 *   "segments" → every shape's per-segment dimension (DimensionLayerRenderer)
 *   "chains"   → inner/outer running chains only (DimensionChainsRenderer)
 *   "both"     → per-segment dimensions and running chains together
 */
export type DimensionDisplay = "segments" | "chains" | "both";

interface EditorStore {
  viewMode: "2d" | "3d";
  snapGrid: number;
  axisAngleThreshold: number;
  snapRadius: number;
  /** Alignment-guide snap distance (px): how close a point must be to another
   *  shape's x/y to latch onto it. Separate from `snapRadius` (point snapping). */
  guideThreshold: number;
  /** Perpendicular-lock tolerance (degrees): how near 90° to another shape a
   *  drag must be before it snaps perpendicular. */
  perpThreshold: number;
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
   * Preset id (see `ASSEMBLY_PRESETS`) applied to newly drawn walls so they are
   * real composite walls. `null` = a plain single-thickness wall using
   * `defaultWallThickness`. The preset's structural-core width becomes the wall's
   * `thickness` (the dimension reference).
   */
  defaultAssemblyPreset: string | null;

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

  /**
   * Continuous (chain) drawing: when on, a chainable segment tool keeps the
   * just-committed endpoint as the next segment's start, so connected runs
   * (walls, lines) are drawn without re-acquiring the previous node. Off =
   * the classic one-segment-per-gesture behaviour. See useDrawingEngine.
   */
  chainDrawing: boolean;

  setViewMode: (mode: "2d" | "3d") => void;
  setGuideThreshold: (threshold: number) => void;
  setPerpThreshold: (threshold: number) => void;
  setDimensionUnit: (unit: DimensionUnit) => void;
  setMeasurementReference: (ref: MeasurementReference) => void;
  setDefaultWallThickness: (thickness: number) => void;
  setDefaultWallHeight: (height: number) => void;
  setDefaultAssemblyPreset: (id: string | null) => void;
  setLinkConnectedNodes: (link: boolean) => void;
  setDimensionDisplay: (mode: DimensionDisplay) => void;
  toggleChainDrawing: () => void;
  setWallJoinStyle: (style: JoinStyle) => void;
  setMiterLimit: (limit: number) => void;
  setWallEndCap: (cap: EndCap) => void;
  setJunctionAlign: (align: JunctionAlign) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  viewMode: "2d",
  snapGrid: 0.5,
  axisAngleThreshold: 1,
  snapRadius: window.matchMedia("(pointer: coarse)").matches ? 8 : 2,
  guideThreshold: 6,
  perpThreshold: 1,
  dimensionUnit: "m",
  // Professional scale: 1px = 1cm, so the wall-material build-ups (≈cm) and the
  // 12cm/2.8m wall defaults below read to real-world size. Keep in sync with the
  // WALL_MATERIALS thickness assumption in core/wall-layers.
  pixelsPerMeter: 100,

  measurementReference: "outer",
  defaultWallThickness: 12,
  defaultWallHeight: 280,
  defaultAssemblyPreset: "singleLeaf",
  linkConnectedNodes: true,
  dimensionDisplay: "both",
  chainDrawing: false,

  wallJoinStyle: DEFAULT_JUNCTION_CONFIG.joinStyle,
  miterLimit: DEFAULT_JUNCTION_CONFIG.miterLimit,
  wallEndCap: DEFAULT_JUNCTION_CONFIG.endCap,
  junctionAlign: DEFAULT_JUNCTION_CONFIG.align,

  setViewMode: (mode) => set({ viewMode: mode }),
  setGuideThreshold: (threshold) => set({ guideThreshold: threshold }),
  setPerpThreshold: (threshold) => set({ perpThreshold: threshold }),
  setDimensionUnit: (unit) => set({ dimensionUnit: unit }),
  setMeasurementReference: (ref) => set({ measurementReference: ref }),
  setDefaultWallThickness: (thickness) => set({ defaultWallThickness: thickness }),
  setDefaultWallHeight: (height) => set({ defaultWallHeight: height }),
  setDefaultAssemblyPreset: (id) => set({ defaultAssemblyPreset: id }),
  setLinkConnectedNodes: (link) => set({ linkConnectedNodes: link }),
  setDimensionDisplay: (mode) => set({ dimensionDisplay: mode }),
  toggleChainDrawing: () => set((s) => ({ chainDrawing: !s.chainDrawing })),
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
