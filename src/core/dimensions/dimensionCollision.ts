/**
 * dimensionCollision.ts — Layer 3 of the dimension system.
 *
 * Detects and resolves overlapping dimension labels using:
 *   - SAT (Separating Axis Theorem) for OBB-vs-OBB collision tests
 *   - Multi-pass resolution: flip side → slide along axis → push offset
 *
 * All inputs and outputs are pure data — no React, no Konva, no store.
 *
 * --- Resolution strategy ---
 *
 * For each pair of colliding labels (processed in order of segment length,
 * shortest first — short segments are more constrained):
 *
 *   Pass 1 — Flip: try placing the label on the opposite side of its segment.
 *            If the flipped position is collision-free, accept it.
 *
 *   Pass 2 — Slide: try shifting the label ±(labelWidth + SLIDE_GAP) along the
 *            dimension line axis. Accepts the first collision-free position.
 *
 *   Pass 3 — Push: increase the offset distance from the segment until
 *            collision-free, up to MAX_PUSH_MULTIPLIER × DIM_OFFSET.
 *
 *   Pass 4 — Accept overlap: mark as `conflicted`. Renderer will draw these
 *            at reduced opacity so the user sees the problem without data loss.
 */

import type { OBB } from "./dimensionLayout";
import {
  computeSegmentDimension,
  flipDimensionSide,
  pushDimensionOffset,
  DIM_OFFSET,
  type DimensionGeometry,
} from "./dimensionGeometry";
import { metricsFromGeometry } from "./dimensionLayout";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SLIDE_GAP = 4;         // px extra clearance when sliding
const MAX_PUSH_STEPS = 4;    // how many offset increments to try before giving up
const PUSH_STEP = DIM_OFFSET * 0.75; // px per push step

// ---------------------------------------------------------------------------
// SAT OBB collision test
// ---------------------------------------------------------------------------

/** Project an OBB onto a unit axis, returning the [min, max] interval. */
const projectOBB = (obb: OBB, axis: { x: number; y: number }): [number, number] => {
  const angleRad = (obb.angleDeg * Math.PI) / 180;
  // OBB local axes
  const ux = Math.cos(angleRad);
  const uy = Math.sin(angleRad);
  const vx = -uy;
  const vy = ux;

  // Center projection
  const centerProj = obb.cx * axis.x + obb.cy * axis.y;

  // Half-extent along axis
  const r =
    obb.hw * Math.abs(ux * axis.x + uy * axis.y) +
    obb.hh * Math.abs(vx * axis.x + vy * axis.y);

  return [centerProj - r, centerProj + r];
};

/** Returns true when the two 1D intervals overlap. */
const intervalsOverlap = ([minA, maxA]: [number, number], [minB, maxB]: [number, number]): boolean =>
  minA < maxB && minB < maxA;

/**
 * SAT OBB intersection test.
 * Tests 4 separating axes (2 per OBB).
 * Returns true when the boxes overlap (i.e., there IS a collision).
 */
export const obbsCollide = (a: OBB, b: OBB): boolean => {
  const aRad = (a.angleDeg * Math.PI) / 180;
  const bRad = (b.angleDeg * Math.PI) / 180;

  const axes = [
    { x: Math.cos(aRad), y: Math.sin(aRad) },   // a local x
    { x: -Math.sin(aRad), y: Math.cos(aRad) },  // a local y
    { x: Math.cos(bRad), y: Math.sin(bRad) },   // b local x
    { x: -Math.sin(bRad), y: Math.cos(bRad) },  // b local y
  ];

  for (const axis of axes) {
    if (!intervalsOverlap(projectOBB(a, axis), projectOBB(b, axis))) {
      return false; // Separating axis found — no collision
    }
  }

  return true; // All axes overlap — collision confirmed
};

// ---------------------------------------------------------------------------
// Candidate type — carries segment coordinates alongside layout data
// ---------------------------------------------------------------------------

export interface DimensionCandidate {
  /** Unique identifier (shape id) */
  id: string;
  /** Segment endpoints */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Formatted label text */
  text: string;
  /** Current geometry (may be mutated during resolution) */
  geom: DimensionGeometry;
  /** Current label metrics */
  metrics: ReturnType<typeof metricsFromGeometry>;
  /**
   * Collision was not fully resolved — render at reduced opacity
   * with a visual indicator.
   */
  conflicted: boolean;
}

// ---------------------------------------------------------------------------
// Resolve collisions — main entry point
// ---------------------------------------------------------------------------

/**
 * Given an array of dimension candidates (each with geometry already computed),
 * resolve all pairwise label collisions in-place and return the mutated array.
 *
 * Processes pairs in order of increasing segment length so shorter (more
 * constrained) segments keep their preferred position and longer segments adapt.
 */
export const resolveCollisions = (
  candidates: DimensionCandidate[],
): DimensionCandidate[] => {
  if (candidates.length < 2) return candidates;

  // Sort by segment length ascending (short segments are highest priority)
  const sorted = [...candidates].sort((a, b) => a.geom.lengthPx - b.geom.lengthPx);

  for (let i = 0; i < sorted.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = sorted[j]; // already-placed label (fixed)
      const b = sorted[i]; // label being placed (try to move)

      if (!obbsCollide(a.metrics.obb, b.metrics.obb)) continue;

      // --- Pass 1: flip to the other side of b's segment ---
      const flippedGeom = flipDimensionSide(b.geom, b.x1, b.y1, b.x2, b.y2);
      const flippedMetrics = metricsFromGeometry(flippedGeom, b.text);
      if (!obbsCollide(a.metrics.obb, flippedMetrics.obb)) {
        // Check flipped position doesn't collide with any already-resolved label
        const clearsAll = sorted
          .slice(0, i)
          .every((prev) => prev === a || !obbsCollide(prev.metrics.obb, flippedMetrics.obb));
        if (clearsAll) {
          b.geom = flippedGeom;
          b.metrics = flippedMetrics;
          continue;
        }
      }

      // --- Pass 2: slide along the dimension line axis ---
      const slideAxisRad = (b.geom.angleDeg * Math.PI) / 180;
      const slideX = Math.cos(slideAxisRad);
      const slideY = Math.sin(slideAxisRad);
      const slideStep = b.metrics.boxWidth / 2 + SLIDE_GAP;

      let resolved = false;
      for (const dir of [1, -1]) {
        const dx = slideX * slideStep * dir;
        const dy = slideY * slideStep * dir;
        const slidOBB: OBB = {
          ...b.metrics.obb,
          cx: b.metrics.obb.cx + dx,
          cy: b.metrics.obb.cy + dy,
        };
        const clearsAll = sorted.slice(0, i).every(
          (prev) => !obbsCollide(prev.metrics.obb, slidOBB),
        );
        if (clearsAll) {
          // Apply slide by updating the geometry anchor and metrics
          const slidGeom: DimensionGeometry = {
            ...b.geom,
            labelAnchor: {
              x: b.geom.labelAnchor.x + dx,
              y: b.geom.labelAnchor.y + dy,
            },
          };
          const slidMetrics = metricsFromGeometry(slidGeom, b.text);
          b.geom = slidGeom;
          b.metrics = slidMetrics;
          resolved = true;
          break;
        }
      }
      if (resolved) continue;

      // --- Pass 3: push offset outward ---
      for (let step = 1; step <= MAX_PUSH_STEPS; step++) {
        const newOffset = DIM_OFFSET + PUSH_STEP * step;
        const pushedGeom = pushDimensionOffset(b.geom, b.x1, b.y1, b.x2, b.y2, newOffset);
        const pushedMetrics = metricsFromGeometry(pushedGeom, b.text);
        const clearsAll = sorted.slice(0, i).every(
          (prev) => !obbsCollide(prev.metrics.obb, pushedMetrics.obb),
        );
        if (clearsAll) {
          b.geom = pushedGeom;
          b.metrics = pushedMetrics;
          resolved = true;
          break;
        }
      }
      if (resolved) continue;

      // --- Pass 4: accept overlap, mark as conflicted ---
      b.conflicted = true;
    }
  }

  // Return in original order (not sorted order) so the renderer
  // preserves insertion order for z-index consistency.
  return candidates;
};

// ---------------------------------------------------------------------------
// Build candidates from shapes
// ---------------------------------------------------------------------------

import type { Shape } from "@/core/drawing-engine/drawing.types";
import type { DimensionUnit } from "@/store/editor.store";
import { formatDimension } from "./dimensionUnits";

const MIN_LENGTH_PX = 10;

/**
 * Build the initial array of DimensionCandidates from the floor-plan shapes.
 * Skips text shapes and shapes too short to annotate.
 */
export const buildCandidates = (
  shapes: Record<string, Shape>,
  dimensionUnit: DimensionUnit,
  pixelsPerMeter: number,
): DimensionCandidate[] => {
  const candidates: DimensionCandidate[] = [];

  for (const shape of Object.values(shapes)) {
    if (shape.type === "text") continue;

    const { x1, y1, x2, y2 } = shape;
    const lengthPx = Math.hypot(x2 - x1, y2 - y1);
    if (lengthPx < MIN_LENGTH_PX) continue;

    const text = formatDimension(lengthPx, dimensionUnit, pixelsPerMeter);
    const geom = computeSegmentDimension(x1, y1, x2, y2);
    const metrics = metricsFromGeometry(geom, text);

    candidates.push({ id: shape.id, x1, y1, x2, y2, text, geom, metrics, conflicted: false });
  }

  return candidates;
};
