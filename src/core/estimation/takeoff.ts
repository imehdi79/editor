/**
 * takeoff — the geometry → estimation bridge.
 *
 * Turns a live drawing (its shapes plus the enclosed spaces traced from them)
 * into the measured quantities the {@link estimate} pipeline consumes. Quantities
 * are aggregated per {@link ElementType} (all walls into one measure, all spaces
 * into floor + ceiling measures), because pricing is linear in quantity — one
 * priced assembly against the summed measure equals the sum of per-element costs,
 * with a far tidier readout.
 *
 * Conversions: lengths are px → m via `pixelsPerMeter`, areas px² → m²; wall
 * height is stored in cm. A wall's area is its construction length × height; a
 * space contributes its net (clear) floor area + perimeter to both floor and
 * ceiling. Pre-existing (retained) walls are excluded by default — they are not
 * new construction (mirrors the drawing-info takeoff tag).
 *
 * Pure — no React / store / Konva. The caller supplies the resolved priced
 * layers per element type (from the admin catalog) and the measured geometry; the
 * engine never reaches into a store.
 */

import type { Shape, WallShape, ArcWallShape } from "@/core/drawing-engine/drawing.types";
import type { Space } from "@/core/spaces/computeSpaces";
import { layeredWallLength } from "@/core/wall-layers/buildWallLayerRows";
import { ELEMENT_TYPES, type ElementType } from "./elementTypes";
import { EMPTY_MEASURE, type ElementMeasure, type EstimateItem, type PricedLayer } from "./estimate";

export interface MeasureOptions {
  /** Canvas px per real metre (editor.store.pixelsPerMeter; 100 ⇒ 1px = 1cm). */
  pixelsPerMeter: number;
  /** Fallback wall height in cm when a wall carries none. */
  defaultWallHeight: number;
  /** Count pre-existing (retained) walls as new construction? Default false. */
  includeExisting?: boolean;
}

/** Sum two measures component-wise (the wall-grouping accumulator). */
export const addMeasure = (a: ElementMeasure, b: ElementMeasure): ElementMeasure => ({
  area: a.area + b.area,
  length: a.length + b.length,
  count: a.count + b.count,
});

/**
 * Measure a single wall: its construction length × height as area, the length as
 * running metres, and a count of 1. The unit a layer is priced in then selects
 * which of these it bills against (see {@link quantityForUnit}).
 */
export const wallMeasure = (wall: WallShape | ArcWallShape, opts: MeasureOptions): ElementMeasure => {
  const ppm = opts.pixelsPerMeter || 1;
  const lengthM = layeredWallLength(wall) / ppm;
  const heightM = (wall.height ?? opts.defaultWallHeight) / 100; // height stored in cm
  return { area: lengthM * heightM, length: lengthM, count: 1 };
};

/**
 * Aggregate the drawing's geometry into one {@link ElementMeasure} per element
 * type. Walls (straight + arc) fold into `wall`; every space contributes its net
 * floor to `floor` and `ceiling`. `roof` has no source shapes yet, so it stays
 * zero. Each measure carries area (m²), running length (m) and a count.
 */
export const measureDrawing = (
  shapes: Record<string, Shape>,
  spaces: readonly Space[],
  opts: MeasureOptions,
): Record<ElementType, ElementMeasure> => {
  const ppm = opts.pixelsPerMeter || 1;
  const out = Object.fromEntries(ELEMENT_TYPES.map((et) => [et, { ...EMPTY_MEASURE }])) as Record<
    ElementType,
    ElementMeasure
  >;

  for (const s of Object.values(shapes)) {
    if (s.type !== "wall" && s.type !== "arc-wall") continue;
    if (s.existing && !opts.includeExisting) continue;
    out.wall = addMeasure(out.wall, wallMeasure(s, opts));
  }

  for (const sp of spaces) {
    const perimeterM = sp.perimeterPx / ppm;
    out.floor.area += sp.floor.areaPx / (ppm * ppm);
    out.floor.length += perimeterM;
    out.floor.count += 1;
    out.ceiling.area += sp.ceiling.areaPx / (ppm * ppm);
    out.ceiling.length += perimeterM;
    out.ceiling.count += 1;
  }

  return out;
};

// ---------------------------------------------------------------------------
// Per-space measuring (floors + ceilings as first-class, per-room entities)
// ---------------------------------------------------------------------------

/** The two horizontal surfaces a space contributes to the takeoff. */
export type SpaceSurface = "floor" | "ceiling";

/**
 * Measure one space's floor + ceiling: net (clear) area in m², the net perimeter
 * as running metres, count 1. Both surfaces share the flat space's net area.
 */
export const spaceMeasure = (space: Space, pixelsPerMeter: number): Record<SpaceSurface, ElementMeasure> => {
  const ppm = pixelsPerMeter || 1;
  const m: ElementMeasure = { area: space.netAreaPx / (ppm * ppm), length: space.perimeterPx / ppm, count: 1 };
  return { floor: { ...m }, ceiling: { ...m } };
};

/** A space's resolved assembly for a surface: a label + its priced layers. */
export interface ResolvedAssembly {
  name: string;
  layers: readonly PricedLayer[];
}

/** Resolve an assembly id to its priced layers, or null when it can't be costed. */
export type AssemblyResolver = (assemblyId: string) => ResolvedAssembly | null;

/** A space missing a costable assembly on one or both surfaces. */
export interface SpaceWarning {
  spaceId: string;
  /** 1-based room number (matches the on-canvas "Space N" label / area rank). */
  index: number;
  /** Surfaces with neither an assignment nor a usable fallback. */
  missing: SpaceSurface[];
}

const SURFACES: SpaceSurface[] = ["floor", "ceiling"];

/**
 * Build the costed estimate items for every space's floor + ceiling, grouped by
 * the resolved assembly (so identical picks sum into one line) — and the warnings
 * for any space whose surface has no assembly (assignment → fallback → none).
 * Missing assemblies are reported, never silently dropped.
 *
 * `spaces` are expected to already carry their persisted assignment ids (fold them
 * in via `withAssignments`); `fallback` supplies a per-surface default; `resolve`
 * maps an assembly id to its priced layers (keeps this pure — no store import).
 */
export const buildSpaceItems = (
  spaces: readonly Space[],
  fallback: Partial<Record<SpaceSurface, string>>,
  resolve: AssemblyResolver,
  pixelsPerMeter: number,
): { items: EstimateItem[]; warnings: SpaceWarning[] } => {
  const groups = new Map<string, { res: ResolvedAssembly; measure: ElementMeasure }>();
  const warnings: SpaceWarning[] = [];

  spaces.forEach((space, i) => {
    const measures = spaceMeasure(space, pixelsPerMeter);
    const missing: SpaceSurface[] = [];
    for (const surface of SURFACES) {
      const assignmentId = surface === "floor" ? space.floorAssemblyId : space.ceilingAssemblyId;
      const id = assignmentId ?? fallback[surface];
      const res = id ? resolve(id) : null;
      if (!res || res.layers.length === 0) {
        missing.push(surface);
        continue;
      }
      const key = `${surface}:${id}`;
      const existing = groups.get(key);
      if (existing) existing.measure = addMeasure(existing.measure, measures[surface]);
      else groups.set(key, { res, measure: { ...measures[surface] } });
    }
    if (missing.length > 0) warnings.push({ spaceId: space.id, index: i + 1, missing });
  });

  const items = [...groups.values()].map(
    (g): EstimateItem => ({ name: g.res.name, layers: g.res.layers, measure: g.measure }),
  );
  return { items, warnings };
};

/** True when an element type has no measured geometry (nothing to cost). */
const isEmpty = (m: ElementMeasure): boolean => m.area === 0 && m.length === 0 && m.count === 0;

/**
 * Build the estimate items for a drawing: one costed element per element type
 * that has both measured geometry and an assigned assembly. Types without an
 * assembly (or with no geometry) are skipped. Each item's `name` is the element
 * type id — the renderer maps it to a localized label.
 */
export const buildTakeoff = (
  measures: Record<ElementType, ElementMeasure>,
  assemblies: Partial<Record<ElementType, readonly PricedLayer[]>>,
): EstimateItem[] =>
  ELEMENT_TYPES.flatMap((et) => {
    const layers = assemblies[et];
    if (!layers || layers.length === 0 || isEmpty(measures[et])) return [];
    return [{ name: et, layers, measure: measures[et] }];
  });
