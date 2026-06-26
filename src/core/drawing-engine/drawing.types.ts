import type { SystemCategory } from "@/core/layers/systemCategories";

export type ShapeId = string;

export interface BaseShape {
  id: ShapeId;
  type: string;
  /**
   * System/discipline category, used for layer visibility. Optional for
   * back-compat; absent = architectural (see categoryOf / DEFAULT_CATEGORY).
   */
  category?: SystemCategory;
}

/** The two faces of a wall. Geometry-agnostic labels — layers are never drawn,
 *  so which face is which is purely a construction/takeoff bookkeeping concern. */
export type WallSide = "inner" | "outer";

/** How two wall bodies resolve where they meet at a corner. Registry-backed by
 *  core/wall-junctions/joinStyles. Canonical here (re-exported by junction.types)
 *  so a WallShape can carry a per-node override without an import cycle. */
export type JoinStyle = "miter" | "butt" | "bevel" | "round";

/**
 * A construction layer's BIM function — its role in the assembly and, crucially,
 * its **junction priority**. Where two composite walls meet, a layer continues
 * (cleans up) through the joint against a neighbour layer of equal-or-higher
 * priority and a lower-priority layer stops at it. `structure` is the
 * load-bearing core (highest priority); `membrane` a thin barrier (lowest).
 * Mirrors Revit's layer Function / ArchiCAD's skin priorities.
 */
export type LayerFunction =
  | "structure"
  | "substrate"
  | "thermal"
  | "finish1"
  | "finish2"
  | "membrane";

/**
 * WallLayer — a single construction layer of a wall (e.g. brick, plaster).
 * `thickness` is the layer's own build-up thickness in px. `function` is its BIM
 * role / junction priority (optional for back-compat — see `LayerFunction`).
 */
export interface WallLayer {
  id: string;
  /** Construction material / name, e.g. "Brick", "Plaster". */
  material: string;
  /** Layer build-up thickness in px. */
  thickness: number;
  /** BIM function / junction priority. Absent → defaulted by position. */
  function?: LayerFunction;
}

export interface WallShape extends BaseShape {
  type: "wall";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Nominal structural thickness (px). Also the fallback per end and the value
   *  used wherever a single thickness is needed (openings, dimensions, takeoff).
   *  For a tapered wall it is kept as the mean of the two end thicknesses. */
  thickness: number;
  /**
   * Optional per-node thickness overrides (px). When set, the wall body tapers
   * from `thicknessP1` at p1 to `thicknessP2` at p2; absent ends fall back to
   * `thickness` (so a normal wall leaves both undefined and stays uniform).
   * Resolve with `endThickness(wall, handle)`.
   */
  thicknessP1?: number;
  thicknessP2?: number;
  /** Wall height in real units. Not drawn in 2D; used for future
   *  surface/volume (area) calculations. Optional for back-compat. */
  height?: number;
  /**
   * Lateral eccentricity (px): the body is shifted this far along the wall's
   * left-hand normal (+n) from the stored centreline (the location line), so a
   * wall can sit off-centre — e.g. flush to one side of a column. 0 / absent =
   * centred. Faces, joins and inner/outer dimensions derive from the offset
   * body; the centreline reference still measures the stored location line.
   */
  offset?: number;
  /**
   * Per-side construction layers (brick, plaster, ...). Each wall face carries
   * an independent stack. Optional for back-compat; absent = no layers defined.
   * Legacy model — superseded by `assembly` when present (the assembly is
   * derived from these when absent, so old documents keep working).
   */
  layers?: Record<WallSide, WallLayer[]>;
  /**
   * BIM composite assembly: the full-width ordered layer stack, exterior(−n /
   * "outer") → interior(+n / "inner"). When present it is the source of truth for
   * rendering / takeoff / junction matching. `coreStart`/`coreEnd` are inclusive
   * indices marking the structural-core slice; `thickness` stays the core width
   * (the location / dimension reference). Absent = derive from `thickness` +
   * `layers` (see `core/wall-layers/wallAssembly`).
   */
  assembly?: WallLayer[];
  coreStart?: number;
  coreEnd?: number;
  /**
   * Per-node join-style override at each endpoint. Absent → the node uses the
   * global `wallJoinStyle` default. A node is shared by every wall meeting there,
   * so these are kept in sync across the node's walls (see useSetNodeJoin); the
   * junction geometry reads the node's override, falling back to the default.
   */
  joinP1?: JoinStyle;
  joinP2?: JoinStyle;
  /**
   * Renovation phase: the wall is pre-existing construction to be retained, not
   * built new. Drawn as light "existing" poché and tagged in the takeoff so its
   * quantities are not counted as new construction. Absent/false = new build.
   */
  existing?: boolean;
  /**
   * Renovation phase: a pre-existing wall scheduled for demolition. Only
   * meaningful when `existing` is true (a new wall is never demolished). Priced
   * as a demolition line (per m² of wall surface) in the pricing takeoff.
   */
  demolish?: boolean;
}

/**
 * ArcWallShape — a curved (circular-arc) wall. A distinct shape/tool, not a flag
 * on the straight wall. Stored as the chord (x1,y1)→(x2,y2) plus a signed
 * `bulge` (sagitta); see core/arc/arcGeometry. Carries the same construction
 * fields as a straight wall (thickness, height, layers, offset). Endpoints join
 * other walls via topology; tangent-mitred arc↔straight junctions are future.
 */
export interface ArcWallShape extends BaseShape {
  type: "arc-wall";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  /** Signed perpendicular sagitta of the arc midpoint from the chord (px). */
  bulge: number;
  height?: number;
  offset?: number;
  layers?: Record<WallSide, WallLayer[]>;
  /** BIM composite assembly (see WallShape.assembly) — full parity with straight
   *  walls. When present it drives the concentric layer bands + takeoff; absent =
   *  derive from `thickness` + `layers`. `thickness` stays the core width. */
  assembly?: WallLayer[];
  coreStart?: number;
  coreEnd?: number;
  /** Per-node join-style override at each endpoint (see WallShape.joinP1/joinP2).
   *  Arc ends join other walls via their tangent at the node, so they honour the
   *  same registry-backed join styles; kept in sync across the node by useSetNodeJoin. */
  joinP1?: JoinStyle;
  joinP2?: JoinStyle;
  /** Renovation phase — pre-existing construction (see WallShape.existing). */
  existing?: boolean;
  /** Renovation phase — scheduled for demolition (see WallShape.demolish). */
  demolish?: boolean;
}

export interface LineShape extends BaseShape {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DashedLineShape extends BaseShape {
  type: "dashed-line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TextShape extends BaseShape {
  type: "text";
  x: number;
  y: number;
  content: string;
}

/**
 * WindowShape — a window opening cut into a wall.
 *
 * Geometry is stored in absolute canvas coordinates (x1/y1 → x2/y2)
 * so that rendering, hit-testing, selection, and transform engines can
 * treat it identically to other segment shapes.
 *
 * wallId tracks which wall it was placed on so that the opening remains
 * logically associated with its host wall (used for future constraint
 * re-projection when the wall is moved/resized).
 */
export interface WindowShape extends BaseShape {
  type: "window";
  /** Start point of the window opening in canvas space */
  x1: number;
  y1: number;
  /** End point of the window opening in canvas space */
  x2: number;
  y2: number;
  /** Width of the opening along the wall (mirrors |x2-x1| projected onto wall) */
  width: number;
  /** Thickness inherited from the host wall for correct visual rendering */
  thickness: number;
  /** ID of the wall this window is attached to (null if freestanding) */
  wallId: ShapeId | null;
}

/**
 * DoorShape — a door opening cut into a wall with a swing arc.
 *
 * Two independent properties define all four valid door configurations:
 *
 *   hingeSide      — which end of the opening is hinged.
 *                    "left"  → hinge at x1/y1 (wall start direction)
 *                    "right" → hinge at x2/y2 (wall end direction)
 *
 *   swingDirection — which side of the wall the door opens toward,
 *                    relative to the wall's left-hand normal.
 *                    "inward"  → toward wall normal
 *                    "outward" → away from wall normal
 *
 * Use computeDoorSwing() to derive all rendering geometry from these fields.
 */
export interface DoorShape extends BaseShape {
  type: "door";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  thickness: number;
  wallId: ShapeId | null;
  hingeSide: "left" | "right";
  swingDirection: "inward" | "outward";
}

export type Shape =
  | WallShape
  | ArcWallShape
  | LineShape
  | DashedLineShape
  | TextShape
  | WindowShape
  | DoorShape;

/** Omit that distributes over a union, so each member keeps its own fields. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * A partial update to a shape: any subset of a single shape variant's mutable
 * fields (everything except id/type). Distributive so wall-only fields like
 * `thickness`/`layers` and door-only fields like `swingDirection` are accepted
 * — a plain `Partial<Omit<Shape, …>>` collapses to the shapes' common keys only.
 */
export type ShapePatch = Partial<DistributiveOmit<Shape, "id" | "type">>;

// Ghost — همون شکل در حین رسم، بدون id
export type GhostShape =
  | Omit<WallShape, "id">
  | Omit<ArcWallShape, "id">
  | Omit<LineShape, "id">
  | Omit<DashedLineShape, "id">
  | Omit<TextShape, "id">
  | Omit<WindowShape, "id">
  | Omit<DoorShape, "id">
  | null;

/** Geometry for drawing a corner-angle arc at a chained vertex. Canonical here
 *  (re-exported by core/wall-utils/wallAngles, which computes it) so the live
 *  DimensionLabel can reference it without the drawing.types → dimensions →
 *  wall-utils import cycle. */
export interface CornerAngle {
  /** Vertex (shared start point) in canvas space */
  vx: number;
  vy: number;
  /** Screen-space (canvas, Y-down) start/end angles of the arc, in radians */
  startRad: number;
  endRad: number;
  /** Whether the canvas arc should sweep counter-clockwise (the minor arc) */
  anticlockwise: boolean;
  /** Bisector direction (radians, screen-space) — used to place the label */
  midRad: number;
  /** Included angle in degrees, range [0, 180] */
  cornerDeg: number;
}

/**
 * All data the live DimensionRenderer needs to draw the floating label while a
 * segment is being drawn. Canonical here (re-exported by
 * core/dimensions/computeDimensions, which builds it) so DrawingHints can carry
 * it without drawing.types reaching up into the dimensions feature.
 *
 * Centering contract: the Konva Text node is positioned at (anchorX, anchorY)
 * with offsetX = halfBoxW and offsetY = halfBoxH, so the text center sits on the
 * anchor and rotation by angleDeg happens about that center.
 */
export interface DimensionLabel {
  /** Anchor point for the label center in canvas space */
  anchorX: number;
  anchorY: number;
  /** Half-width of the rendered box (= Konva offsetX) */
  halfBoxW: number;
  /** Half-height of the rendered box (= Konva offsetY) */
  halfBoxH: number;
  /** Formatted text (e.g. "250cm") */
  text: string;
  /** Rotation angle in degrees — never upside-down (clamped to [-90, 90]) */
  angleDeg: number;
  /** Length of the segment in canvas pixels */
  lengthPx: number;
  /** Absolute bearing of the segment (East = 0°, CCW, [0, 360)) — already
   *  baked into `text`; kept here for non-text consumers. */
  absAngleDeg: number;
  /** Corner angle vs the previous connected wall, null when not chaining. */
  corner: CornerAngle | null;
}

export interface SnapResult {
  x: number;
  y: number;
  snapped: boolean;
  snapType: "grid" | "node" | "midpoint" | "intersection" | "edge" | null;
  snappedTo: { x: number; y: number } | null; // نقطه‌ای که snap شدیم بهش
  /** Host shape id for an `edge` (wall-body) snap, so the resolver can intersect
   *  a lock line with that wall. null for node/midpoint/intersection/no snap. */
  snappedShapeId?: ShapeId | null;
}

export interface GuideLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  axis: "horizontal" | "vertical";
}

export interface DrawingHints {
  snapResult: SnapResult | null;
  guides: GuideLine[];
  axisLocked: boolean;
  axisLockAngle: "horizontal" | "vertical" | null;
  perpLocked: boolean;
  dimension: DimensionLabel | null;
}
