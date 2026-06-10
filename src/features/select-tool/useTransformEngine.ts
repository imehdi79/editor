/**
 * useTransformEngine — move, endpoint-resize, and rotate for the select tool.
 *
 * Three interaction modes determined on mousedown by what was grabbed:
 *
 *   "move"   — pointer landed on the shape body
 *              Both endpoints translate by the delta from grab point.
 *              resolvePoint applied to the grab point: axis lock constrains
 *              the delta direction; snap/guides applied to each endpoint.
 *
 *   "resize" — pointer landed on endpoint handle (p1 or p2)
 *              The dragged endpoint moves through the full resolvePoint
 *              pipeline (grid, snap, perp lock, axis lock, guides, dimension).
 *              The other endpoint stays fixed.
 *
 *   "rotate" — pointer landed on the rotation handle (above midpoint)
 *              Angle from shape midpoint to cursor, quantised to
 *              axisAngleThreshold steps if near 0/45/90/135/180°.
 *              Shape length is preserved; endpoints recomputed from
 *              midpoint + half-length in each direction.
 *
 * Live preview is kept in local React state (previewShape).
 * The floor-plan store is written only on mouseUp — one undo entry per drag.
 *
 * Hit-test radii are intentionally generous for touch usability.
 */

import { useCallback, useRef, useState } from "react";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useSelectionStore } from "@/store/selection.store";
import { useEditorStore } from "@/store/editor.store";
import { resolvePoint, type ResolveConfig } from "@/core/drawing-engine/resolvePoint";
import type { Shape, DrawingHints, GhostShape } from "@/core/drawing-engine/drawing.types";
import { computeTopology, nodeKey, type TopologyMap } from "@/core/topology/computeTopology";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HANDLE_HIT_RADIUS = 12; // px — endpoint / rotation handle hit zone
const ROTATE_HANDLE_OFFSET = 28; // px above midpoint for the rotation handle
const BODY_HIT_RADIUS = 8; // px — shape body hit zone

const EMPTY_HINTS: DrawingHints = {
  snapResult: null,
  guides: [],
  axisLocked: false,
  axisLockAngle: null,
  perpLocked: false,
  dimension: null,
};

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

const distSq = (ax: number, ay: number, bx: number, by: number) => (ax - bx) ** 2 + (ay - by) ** 2;

const pointToSegmentDistSq = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax,
    dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distSq(px, py, ax, ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return distSq(px, py, ax + t * dx, ay + t * dy);
};

// Rotation handle position: perpendicular above midpoint
const rotationHandlePos = (shape: Exclude<Shape, { type: "text" }>) => {
  const mx = (shape.x1 + shape.x2) / 2;
  const my = (shape.y1 + shape.y2) / 2;
  const dx = shape.x2 - shape.x1;
  const dy = shape.y2 - shape.y1;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular direction (rotated -90°)
  return { x: mx + (-dy / len) * ROTATE_HANDLE_OFFSET, y: my + (dx / len) * ROTATE_HANDLE_OFFSET };
};

// Snap angle to nearest N degrees (for 0, 45, 90, 135, 180)
const snapAngle = (angleDeg: number, threshold: number): number => {
  const snaps = [0, 45, 90, 135, 180, 225, 270, 315, 360];
  for (const snap of snaps) {
    if (Math.abs(((angleDeg - snap + 540) % 360) - 180) < threshold) return snap % 360;
  }
  return angleDeg;
};

// ---------------------------------------------------------------------------
// Interaction mode
// ---------------------------------------------------------------------------

type TransformMode =
  | { kind: "idle" }
  | { kind: "move"; shapeId: string; grabOffsetX: number; grabOffsetY: number }
  | {
      kind: "resize";
      shapeId: string;
      handle: "p1" | "p2";
      /** Topology node key — all endpoints sharing this key move together */
      nodeKey: string;
    }
  | { kind: "rotate"; shapeId: string };

// ---------------------------------------------------------------------------
// Hit test — what did the pointer land on?
// ---------------------------------------------------------------------------

const hitTestShape = (x: number, y: number, shape: Shape): "p1" | "p2" | "rotate" | "body" | null => {
  if (shape.type === "text") {
    return distSq(x, y, shape.x, shape.y) < (HANDLE_HIT_RADIUS * 2) ** 2 ? "body" : null;
  }

  const rSq = HANDLE_HIT_RADIUS ** 2;

  // Endpoint handles
  if (distSq(x, y, shape.x1, shape.y1) < rSq) return "p1";
  if (distSq(x, y, shape.x2, shape.y2) < rSq) return "p2";

  // Rotation handle
  const rh = rotationHandlePos(shape);
  if (distSq(x, y, rh.x, rh.y) < rSq) return "rotate";

  // Body — window and door have thickness just like walls
  const thick = shape.type === "wall" || shape.type === "window" || shape.type === "door" ? shape.thickness / 2 : 0;
  const effectiveRSq = Math.max(BODY_HIT_RADIUS ** 2, thick ** 2);
  if (pointToSegmentDistSq(x, y, shape.x1, shape.y1, shape.x2, shape.y2) <= effectiveRSq) return "body";

  return null;
};

const hitTestShapes = (
  x: number,
  y: number,
  shapes: Record<string, Shape>,
): { shapeId: string; zone: "p1" | "p2" | "rotate" | "body" } | null => {
  for (const shape of Object.values(shapes).reverse()) {
    const zone = hitTestShape(x, y, shape);
    if (zone) return { shapeId: shape.id, zone };
  }
  return null;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useTransformEngine = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const updateShape = useFloorPlanStore((s) => s.updateShape);
  const selectShape = useSelectionStore((s) => s.selectShape);
  const selectedId = useSelectionStore((s) => s.selectedId);

  const snapGrid = useEditorStore((s) => s.snapGrid);
  const axisAngleThreshold = useEditorStore((s) => s.axisAngleThreshold);
  const snapRadius = useEditorStore((s) => s.snapRadius);
  const dimensionUnit = useEditorStore((s) => s.dimensionUnit);
  const pixelsPerMeter = useEditorStore((s) => s.pixelsPerMeter);

  const modeRef = useRef<TransformMode>({ kind: "idle" });
  const [previewShape, setPreviewShape] = useState<GhostShape>(null);
  /**
   * During a shared-node resize, every shape that shares the dragged node
   * needs to preview its updated position. This map holds those previews.
   * Key = shapeId, value = partial coordinate patch.
   */
  const [connectedPreviews, setConnectedPreviews] = useState<
    Record<string, { x1?: number; y1?: number; x2?: number; y2?: number }>
  >({});
  const [hints, setHints] = useState<DrawingHints>(EMPTY_HINTS);

  const makeConfig = useCallback(
    (): ResolveConfig => ({ snapGrid, axisAngleThreshold, snapRadius, dimensionUnit, pixelsPerMeter, shapes }),
    [snapGrid, axisAngleThreshold, snapRadius, dimensionUnit, pixelsPerMeter, shapes],
  );

  const makeConfigExcluding = useCallback(
    (excludeId: string): ResolveConfig => {
      const { [excludeId]: _, ...rest } = shapes;
      return { snapGrid, axisAngleThreshold, snapRadius, dimensionUnit, pixelsPerMeter, shapes: rest };
    },
    [snapGrid, axisAngleThreshold, snapRadius, dimensionUnit, pixelsPerMeter, shapes],
  );

  // -------------------------------------------------------------------------
  // mousedown — determine mode
  // -------------------------------------------------------------------------

  const onMouseDown = useCallback(
    (rawX: number, rawY: number) => {
      const { x, y } = resolvePoint(rawX, rawY, makeConfig());
      const hit = hitTestShapes(x, y, shapes);

      if (!hit) {
        selectShape(null);
        modeRef.current = { kind: "idle" };
        return;
      }

      selectShape(hit.shapeId);
      const shape = shapes[hit.shapeId];

      if (hit.zone === "body") {
        if (shape.type === "text") {
          modeRef.current = {
            kind: "move",
            shapeId: hit.shapeId,
            grabOffsetX: rawX - shape.x,
            grabOffsetY: rawY - shape.y,
          };
        } else {
          const mx = (shape.x1 + shape.x2) / 2;
          const my = (shape.y1 + shape.y2) / 2;
          modeRef.current = { kind: "move", shapeId: hit.shapeId, grabOffsetX: rawX - mx, grabOffsetY: rawY - my };
        }
        setPreviewShape({ ...shape } as GhostShape);
        setConnectedPreviews({});
      } else if (hit.zone === "p1" || hit.zone === "p2") {
        // Compute the node key for this endpoint so onMouseMove can fan out
        const epX =
          hit.zone === "p1"
            ? (shape as Exclude<Shape, { type: "text" }>).x1
            : (shape as Exclude<Shape, { type: "text" }>).x2;
        const epY =
          hit.zone === "p1"
            ? (shape as Exclude<Shape, { type: "text" }>).y1
            : (shape as Exclude<Shape, { type: "text" }>).y2;
        modeRef.current = {
          kind: "resize",
          shapeId: hit.shapeId,
          handle: hit.zone,
          nodeKey: nodeKey(epX, epY),
        };
        setPreviewShape({ ...shape } as GhostShape);
        setConnectedPreviews({});
      } else if (hit.zone === "rotate") {
        modeRef.current = { kind: "rotate", shapeId: hit.shapeId };
        setPreviewShape({ ...shape } as GhostShape);
        setConnectedPreviews({});
      }
    },
    [shapes, selectShape, makeConfig],
  );

  // -------------------------------------------------------------------------
  // mousemove — update preview
  // -------------------------------------------------------------------------

  const onMouseMove = useCallback(
    (rawX: number, rawY: number) => {
      const mode = modeRef.current;
      if (mode.kind === "idle") return;

      const shape = shapes[mode.shapeId];
      if (!shape) return;

      // ---- MOVE ----
      if (mode.kind === "move") {
        const config = makeConfigExcluding(mode.shapeId);

        if (shape.type === "text") {
          const { x, y, guides, pointSnap, axisLocked, axisLockAngle } = resolvePoint(
            rawX - mode.grabOffsetX,
            rawY - mode.grabOffsetY,
            config,
          );
          setPreviewShape({ ...shape, x, y });
          setHints({
            snapResult: pointSnap.snapped ? pointSnap : null,
            guides,
            axisLocked,
            axisLockAngle,
            perpLocked: false,
            dimension: null,
          });
          setConnectedPreviews({});
        } else {
          const mx0 = (shape.x1 + shape.x2) / 2;
          const my0 = (shape.y1 + shape.y2) / 2;
          const {
            x: mx,
            y: my,
            guides,
            pointSnap,
            axisLocked,
            axisLockAngle,
          } = resolvePoint(rawX - mode.grabOffsetX, rawY - mode.grabOffsetY, config, mx0, my0);
          const dx = mx - mx0;
          const dy = my - my0;
          setPreviewShape({
            ...shape,
            x1: shape.x1 + dx,
            y1: shape.y1 + dy,
            x2: shape.x2 + dx,
            y2: shape.y2 + dy,
          } as GhostShape);
          setHints({
            snapResult: pointSnap.snapped ? pointSnap : null,
            guides,
            axisLocked,
            axisLockAngle,
            perpLocked: false,
            dimension: null,
          });

          // Fan out to all shapes connected at either endpoint of the moved shape.
          // Each connected endpoint translates by the same (dx, dy) so walls stay joined.
          const topology = computeTopology(shapes);
          const previews: Record<string, { x1?: number; y1?: number; x2?: number; y2?: number }> = {};

          for (const epKey of [nodeKey(shape.x1, shape.y1), nodeKey(shape.x2, shape.y2)]) {
            const node = topology.get(epKey);
            if (!node) continue;
            for (const ref of node.refs) {
              if (ref.shapeId === mode.shapeId) continue; // primary shape handled above
              // Accumulate — a shape connected at BOTH endpoints (degenerate loop) gets both coords updated
              const existing = previews[ref.shapeId] ?? {};
              previews[ref.shapeId] =
                ref.handle === "p1"
                  ? { ...existing, x1: ref.x + dx, y1: ref.y + dy }
                  : { ...existing, x2: ref.x + dx, y2: ref.y + dy };
            }
          }

          setConnectedPreviews(previews);
        }
      }

      // ---- RESIZE ----
      else if (mode.kind === "resize" && shape.type !== "text") {
        const fixedX = mode.handle === "p1" ? shape.x2 : shape.x1;
        const fixedY = mode.handle === "p1" ? shape.y2 : shape.y1;
        const config = makeConfigExcluding(mode.shapeId);

        const { x, y, guides, pointSnap, axisLocked, axisLockAngle, perpLocked, dimension } = resolvePoint(
          rawX,
          rawY,
          config,
          fixedX,
          fixedY,
        );

        // Update the primary selected shape preview
        const updated = mode.handle === "p1" ? { ...shape, x1: x, y1: y } : { ...shape, x2: x, y2: y };
        setPreviewShape(updated as GhostShape);

        // Fan out to all shapes that share the dragged node
        // Topology is recomputed from current shapes (cheap — O(n))
        const topology = computeTopology(shapes);
        const node = topology.get(mode.nodeKey);
        const previews: Record<string, { x1?: number; y1?: number; x2?: number; y2?: number }> = {};

        if (node) {
          for (const ref of node.refs) {
            if (ref.shapeId === mode.shapeId) continue; // primary shape handled above
            previews[ref.shapeId] = ref.handle === "p1" ? { x1: x, y1: y } : { x2: x, y2: y };
          }
        }

        setConnectedPreviews(previews);
        setHints({
          snapResult: pointSnap.snapped ? pointSnap : null,
          guides,
          axisLocked,
          axisLockAngle,
          perpLocked,
          dimension,
        });
      }

      // ---- ROTATE ----
      else if (mode.kind === "rotate" && shape.type !== "text") {
        const mx = (shape.x1 + shape.x2) / 2;
        const my = (shape.y1 + shape.y2) / 2;
        const halfLen = Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1) / 2;

        const rawAngleDeg = Math.atan2(rawY - my, rawX - mx) * (180 / Math.PI);
        const angleDeg = snapAngle(rawAngleDeg, axisAngleThreshold);
        const angleRad = angleDeg * (Math.PI / 180);

        const x1 = mx - Math.cos(angleRad) * halfLen;
        const y1 = my - Math.sin(angleRad) * halfLen;
        const x2 = mx + Math.cos(angleRad) * halfLen;
        const y2 = my + Math.sin(angleRad) * halfLen;

        setPreviewShape({ ...shape, x1, y1, x2, y2 } as GhostShape);
        setHints(EMPTY_HINTS);
        setConnectedPreviews({});
      }
    },
    [shapes, makeConfigExcluding, axisAngleThreshold],
  );

  // -------------------------------------------------------------------------
  // mouseup — commit to store (one undo entry covers all connected shapes)
  // -------------------------------------------------------------------------

  const onMouseUp = useCallback(
    (_rawX: number, _rawY: number) => {
      const mode = modeRef.current;
      if (mode.kind === "idle") return;

      // Commit the primary shape
      const shape = shapes[mode.shapeId];
      if (shape && previewShape) {
        const { id: _id, ...patch } = previewShape as Shape;
        updateShape(mode.shapeId, patch);
      }

      // Commit all connected shapes that were co-dragged
      for (const [shapeId, patch] of Object.entries(connectedPreviews)) {
        updateShape(shapeId, patch as Partial<Omit<Shape, "id" | "type">>);
      }

      modeRef.current = { kind: "idle" };
      setPreviewShape(null);
      setConnectedPreviews({});
      setHints(EMPTY_HINTS);
    },
    [shapes, previewShape, connectedPreviews, updateShape],
  );

  const transformingId = modeRef.current.kind !== "idle" ? modeRef.current.shapeId : null;

  return { previewShape, connectedPreviews, hints, onMouseDown, onMouseMove, onMouseUp, transformingId, selectedId };
};

// ---------------------------------------------------------------------------
// Export rotation handle position so SelectionRenderer can draw the handle
// ---------------------------------------------------------------------------

export { rotationHandlePos };
