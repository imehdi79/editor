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
import { useViewportStore } from "@/store/viewport.store";
import { resolvePoint, type ResolveConfig } from "@/core/drawing-engine/resolvePoint";
import type { Shape, DrawingHints, GhostShape, DoorShape, ShapePatch } from "@/core/drawing-engine/drawing.types";
import { computeTopology, nodeKey, type TopologyMap } from "@/core/topology/computeTopology";
import { findWallById, slideOpening, resizeOpeningEndpoint, tOnWall } from "@/core/wall-utils/wallGeometry";
import { arcPolyline } from "@/core/arc/arcGeometry";
import { useLayersStore } from "@/store/layers.store";
import { categoryOf } from "@/core/layers/systemCategories";
import { HANDLE_HIT_RADIUS, BODY_HIT_RADIUS, ROTATE_HANDLE_OFFSET } from "./handleMetrics";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// HANDLE_HIT_RADIUS / BODY_HIT_RADIUS / ROTATE_HANDLE_OFFSET are screen-px sizes
// from handleMetrics; the hit-test divides them by the viewport scale so targets
// stay finger-sized at every zoom level.
/** Pointer travel (screen px) under which a node press-release counts as a tap. */
const NODE_TAP_MAX_TRAVEL = 6;

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

// Rotation handle position: perpendicular above midpoint. `offset` is in world
// px — callers pass ROTATE_HANDLE_OFFSET / scale so the arm is a constant screen
// length at every zoom.
const rotationHandlePos = (shape: Exclude<Shape, { type: "text" }>, offset: number = ROTATE_HANDLE_OFFSET) => {
  const mx = (shape.x1 + shape.x2) / 2;
  const my = (shape.y1 + shape.y2) / 2;
  const dx = shape.x2 - shape.x1;
  const dy = shape.y2 - shape.y1;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular direction (rotated -90°)
  return { x: mx + (-dy / len) * offset, y: my + (dx / len) * offset };
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

// `scale` is the viewport zoom; screen-px hit sizes are divided by it so the
// world-space tolerance grows as you zoom out, keeping a constant touch target.
const hitTestShape = (x: number, y: number, shape: Shape, scale: number): "p1" | "p2" | "rotate" | "hinge" | "body" | null => {
  const handleR = HANDLE_HIT_RADIUS / scale;
  const bodyR = BODY_HIT_RADIUS / scale;
  const rotateOffset = ROTATE_HANDLE_OFFSET / scale;

  if (shape.type === "text") {
    return distSq(x, y, shape.x, shape.y) < (handleR * 2) ** 2 ? "body" : null;
  }

  const rSq = handleR ** 2;

  // Endpoint handles
  if (distSq(x, y, shape.x1, shape.y1) < rSq) return "p1";
  if (distSq(x, y, shape.x2, shape.y2) < rSq) return "p2";

  // Rotation handle (above midpoint)
  const rh = rotationHandlePos(shape, rotateOffset);
  if (distSq(x, y, rh.x, rh.y) < rSq) return "rotate";

  // Door: second handle below midpoint for hingeSide toggle
  if (shape.type === "door") {
    const mx = (shape.x1 + shape.x2) / 2;
    const my = (shape.y1 + shape.y2) / 2;
    const dx = shape.x2 - shape.x1;
    const dy = shape.y2 - shape.y1;
    const len = Math.hypot(dx, dy) || 1;
    const hx = mx - (-dy / len) * rotateOffset;
    const hy = my - (dx / len) * rotateOffset;
    if (distSq(x, y, hx, hy) < rSq) return "hinge";
  }

  // Body — arc walls test the curve, not the chord.
  if (shape.type === "arc-wall") {
    const effRSq = Math.max(bodyR ** 2, (shape.thickness / 2) ** 2);
    const pts = arcPolyline(shape.x1, shape.y1, shape.x2, shape.y2, shape.bulge, 24);
    for (let i = 0; i + 3 < pts.length; i += 2) {
      if (pointToSegmentDistSq(x, y, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]) <= effRSq) return "body";
    }
    return null;
  }

  const thick = shape.type === "wall" || shape.type === "window" || shape.type === "door" ? shape.thickness / 2 : 0;
  const effectiveRSq = Math.max(bodyR ** 2, thick ** 2);
  if (pointToSegmentDistSq(x, y, shape.x1, shape.y1, shape.x2, shape.y2) <= effectiveRSq) return "body";

  return null;
};

const hitTestShapes = (
  x: number,
  y: number,
  shapes: Record<string, Shape>,
  scale: number,
  isSelectable: (shape: Shape) => boolean = () => true,
): { shapeId: string; zone: "p1" | "p2" | "rotate" | "hinge" | "body" } | null => {
  for (const shape of Object.values(shapes).reverse()) {
    if (!isSelectable(shape)) continue; // shapes on hidden layers aren't pickable
    const zone = hitTestShape(x, y, shape, scale);
    if (zone) return { shapeId: shape.id, zone };
  }
  return null;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @param onNodeTap Called when a wall node handle is tapped (pressed and
 *   released without dragging) — used to open the on-canvas thickness editor.
 *   Fires only for wall / arc-wall shapes; the no-op resize is not committed.
 */
export const useTransformEngine = (onNodeTap?: (shapeId: string, handle: "p1" | "p2") => void) => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const updateShape = useFloorPlanStore((s) => s.updateShape);
  const selectShape = useSelectionStore((s) => s.selectShape);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const scale = useViewportStore((s) => s.scale);

  const categoryVisibility = useLayersStore((s) => s.visibility);

  const snapGrid = useEditorStore((s) => s.snapGrid);
  const axisAngleThreshold = useEditorStore((s) => s.axisAngleThreshold);
  const snapRadius = useEditorStore((s) => s.snapRadius);
  const guideThreshold = useEditorStore((s) => s.guideThreshold);
  const perpThreshold = useEditorStore((s) => s.perpThreshold);
  const dimensionUnit = useEditorStore((s) => s.dimensionUnit);
  const pixelsPerMeter = useEditorStore((s) => s.pixelsPerMeter);
  const linkConnectedNodes = useEditorStore((s) => s.linkConnectedNodes);

  const modeRef = useRef<TransformMode>({ kind: "idle" });
  /**
   * Snapshot taken once at drag start. The committed shapes don't change until
   * mouseUp, so the topology graph and the "everything except the dragged
   * shape" resolve-config are constant for the whole drag. Computing them once
   * here — instead of rebuilding `computeTopology(shapes)` and re-spreading the
   * shapes map on every pointer-move frame — is the key mobile-perf win.
   */
  const dragSnapshotRef = useRef<{ topology: TopologyMap | null; config: ResolveConfig } | null>(null);
  /** Pointer-down point + whether the pointer has travelled — for node tap vs drag. */
  const pressRef = useRef<{ x: number; y: number; moved: boolean }>({ x: 0, y: 0, moved: false });
  /**
   * Set when a press lands on empty space. Deselection is deferred to mouseup so
   * an empty-space *drag* (which pans the canvas in the merged select+pan tool)
   * keeps the current selection — only an empty *tap* clears it.
   */
  const pendingDeselectRef = useRef(false);
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
    (): ResolveConfig => ({ snapGrid, axisAngleThreshold, snapRadius, guideThreshold, perpThreshold, dimensionUnit, pixelsPerMeter, shapes }),
    [snapGrid, axisAngleThreshold, snapRadius, guideThreshold, perpThreshold, dimensionUnit, pixelsPerMeter, shapes],
  );

  /**
   * Would a press at this world point grab a (selectable) shape? Used by the
   * merged select+pan tool to decide whether an empty-space drag should pan the
   * canvas instead of selecting. Mirrors the hit-test used on mousedown.
   */
  const hitTest = useCallback(
    (worldX: number, worldY: number): boolean =>
      hitTestShapes(worldX, worldY, shapes, scale, (s) => categoryVisibility[categoryOf(s)]) !== null,
    [shapes, scale, categoryVisibility],
  );

  const makeConfigExcluding = useCallback(
    (excludeId: string): ResolveConfig => {
      const { [excludeId]: _, ...rest } = shapes;
      return { snapGrid, axisAngleThreshold, snapRadius, guideThreshold, perpThreshold, dimensionUnit, pixelsPerMeter, shapes: rest };
    },
    [snapGrid, axisAngleThreshold, snapRadius, guideThreshold, perpThreshold, dimensionUnit, pixelsPerMeter, shapes],
  );

  // -------------------------------------------------------------------------
  // mousedown — determine mode
  // -------------------------------------------------------------------------

  const onMouseDown = useCallback(
    (rawX: number, rawY: number) => {
      pressRef.current = { x: rawX, y: rawY, moved: false };
      pendingDeselectRef.current = false;
      const { x, y } = resolvePoint(rawX, rawY, makeConfig());
      const hit = hitTestShapes(x, y, shapes, scale, (s) => categoryVisibility[categoryOf(s)]);

      if (!hit) {
        // Defer the deselect to mouseup: a drag from here pans (keep selection),
        // a tap clears it.
        pendingDeselectRef.current = true;
        modeRef.current = { kind: "idle" };
        return;
      }

      selectShape(hit.shapeId);
      const shape = shapes[hit.shapeId];

      // Snapshot the data that stays constant for the whole drag — built once
      // here, reused on every pointer-move (see dragSnapshotRef).
      dragSnapshotRef.current = {
        topology: linkConnectedNodes ? computeTopology(shapes) : null,
        config: makeConfigExcluding(hit.shapeId),
      };

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
        if (shape.type === "door") {
          // Toggle swingDirection: inward ↔ outward
          const { id: _id, ...patch } = {
            ...shape,
            swingDirection: shape.swingDirection === "inward" ? "outward" : "inward",
          } as DoorShape;
          updateShape(hit.shapeId, patch);
          modeRef.current = { kind: "idle" };
        } else if (shape.type === "window") {
          // Flip window direction (swap endpoints)
          const { id: _id, ...patch } = { ...shape, x1: shape.x2, y1: shape.y2, x2: shape.x1, y2: shape.y1 };
          updateShape(hit.shapeId, patch);
          modeRef.current = { kind: "idle" };
        } else {
          modeRef.current = { kind: "rotate", shapeId: hit.shapeId };
          setPreviewShape({ ...shape } as GhostShape);
          setConnectedPreviews({});
        }
      } else if (hit.zone === "hinge" && shape.type === "door") {
        // Toggle hingeSide: left ↔ right
        const { id: _id, ...patch } = {
          ...shape,
          hingeSide: shape.hingeSide === "left" ? "right" : "left",
        } as DoorShape;
        updateShape(hit.shapeId, patch);
        modeRef.current = { kind: "idle" };
      }
    },
    [shapes, selectShape, updateShape, makeConfig, makeConfigExcluding, linkConnectedNodes, categoryVisibility, scale],
  );

  // -------------------------------------------------------------------------
  // mousemove — update preview
  // -------------------------------------------------------------------------

  const onMouseMove = useCallback(
    (rawX: number, rawY: number) => {
      const mode = modeRef.current;

      // Track pointer travel (screen px) so a press-release with no drag counts
      // as a tap on mouseup — used for the node-tap editor and the empty-space
      // tap-to-deselect (which must not fire when an empty drag pans the canvas).
      if (!pressRef.current.moved) {
        const travel = Math.hypot(rawX - pressRef.current.x, rawY - pressRef.current.y) * scale;
        if (travel > NODE_TAP_MAX_TRAVEL) pressRef.current.moved = true;
      }

      if (mode.kind === "idle") return;

      const shape = shapes[mode.shapeId];
      if (!shape) return;

      // ---- MOVE ----
      if (mode.kind === "move") {
        const config = dragSnapshotRef.current?.config ?? makeConfigExcluding(mode.shapeId);

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
        } else if (shape.type === "door" || shape.type === "window") {
          // Wall-constrained slide: project cursor onto host wall, preserve width
          const wall = findWallById(shape.wallId, shapes);
          if (wall) {
            const halfW = Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1) / 2;
            const newCoords = slideOpening(wall, rawX, rawY, halfW);
            const newWidth = Math.hypot(newCoords.x2 - newCoords.x1, newCoords.y2 - newCoords.y1);
            setPreviewShape({ ...shape, ...newCoords, width: newWidth } as GhostShape);
          } else {
            // No host wall — fall back to free move (orphaned opening)
            const mx0 = (shape.x1 + shape.x2) / 2;
            const my0 = (shape.y1 + shape.y2) / 2;
            const dx = rawX - mode.grabOffsetX - mx0;
            const dy = rawY - mode.grabOffsetY - my0;
            setPreviewShape({
              ...shape,
              x1: shape.x1 + dx,
              y1: shape.y1 + dy,
              x2: shape.x2 + dx,
              y2: shape.y2 + dy,
            } as GhostShape);
          }
          setHints(EMPTY_HINTS);
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

          // Fan out to all shapes connected at either endpoint of the moved
          // shape — unless the "move connected" setting is off, in which case
          // the shape detaches and moves on its own.
          const previews: Record<string, { x1?: number; y1?: number; x2?: number; y2?: number }> = {};
          const topology = dragSnapshotRef.current?.topology;
          if (topology) {
            for (const epKey of [nodeKey(shape.x1, shape.y1), nodeKey(shape.x2, shape.y2)]) {
              const node = topology.get(epKey);
              if (!node) continue;
              for (const ref of node.refs) {
                if (ref.shapeId === mode.shapeId) continue;
                const existing = previews[ref.shapeId] ?? {};
                previews[ref.shapeId] =
                  ref.handle === "p1"
                    ? { ...existing, x1: ref.x + dx, y1: ref.y + dy }
                    : { ...existing, x2: ref.x + dx, y2: ref.y + dy };
              }
            }
          }
          setConnectedPreviews(previews);
        }
      }

      // ---- RESIZE ----
      else if (mode.kind === "resize" && shape.type !== "text") {
        if (shape.type === "door" || shape.type === "window") {
          // Wall-constrained resize: drag one endpoint along the wall
          const wall = findWallById(shape.wallId, shapes);
          if (wall) {
            // Fixed endpoint's parametric t on the wall
            const fixedX = mode.handle === "p1" ? shape.x2 : shape.x1;
            const fixedY = mode.handle === "p1" ? shape.y2 : shape.y1;
            const fixedT = tOnWall(fixedX, fixedY, wall);
            const newCoords = resizeOpeningEndpoint(wall, fixedT, rawX, rawY);
            const newWidth = Math.hypot(newCoords.x2 - newCoords.x1, newCoords.y2 - newCoords.y1);
            setPreviewShape({ ...shape, ...newCoords, width: newWidth } as GhostShape);
          }
          setHints(EMPTY_HINTS);
          setConnectedPreviews({});
        } else {
          const fixedX = mode.handle === "p1" ? shape.x2 : shape.x1;
          const fixedY = mode.handle === "p1" ? shape.y2 : shape.y1;
          const config = dragSnapshotRef.current?.config ?? makeConfigExcluding(mode.shapeId);

          const { x, y, guides, pointSnap, axisLocked, axisLockAngle, perpLocked, dimension } = resolvePoint(
            rawX,
            rawY,
            config,
            fixedX,
            fixedY,
          );

          const updated = mode.handle === "p1" ? { ...shape, x1: x, y1: y } : { ...shape, x2: x, y2: y };
          setPreviewShape(updated as GhostShape);

          // Drag the shared node's other shapes along, unless the "move
          // connected" setting is off — then only this endpoint moves.
          const previews: Record<string, { x1?: number; y1?: number; x2?: number; y2?: number }> = {};
          const topology = dragSnapshotRef.current?.topology;
          if (topology) {
            const node = topology.get(mode.nodeKey);
            if (node) {
              for (const ref of node.refs) {
                if (ref.shapeId === mode.shapeId) continue;
                previews[ref.shapeId] = ref.handle === "p1" ? { x1: x, y1: y } : { x2: x, y2: y };
              }
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
      }

      // ---- ROTATE ----
      else if (mode.kind === "rotate" && shape.type !== "text") {
        // door/window rotate is instant-commit on mousedown — never reaches mousemove
        if (shape.type === "door" || shape.type === "window") return;
        // All other shapes: free rotate following cursor
        const mx = (shape.x1 + shape.x2) / 2;
        const my = (shape.y1 + shape.y2) / 2;
        const halfLen = Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1) / 2;
        const rawAngleDeg = Math.atan2(rawY - my, rawX - mx) * (180 / Math.PI);
        const angleDeg = snapAngle(rawAngleDeg, axisAngleThreshold);
        const angleRad = angleDeg * (Math.PI / 180);
        setPreviewShape({
          ...shape,
          x1: mx - Math.cos(angleRad) * halfLen,
          y1: my - Math.sin(angleRad) * halfLen,
          x2: mx + Math.cos(angleRad) * halfLen,
          y2: my + Math.sin(angleRad) * halfLen,
        } as GhostShape);
        setHints(EMPTY_HINTS);
        setConnectedPreviews({});
      }
    },
    [shapes, makeConfigExcluding, axisAngleThreshold, scale],
  );

  // -------------------------------------------------------------------------
  // mouseup — commit to store (one undo entry covers all connected shapes)
  // -------------------------------------------------------------------------

  const onMouseUp = useCallback(
    (_rawX: number, _rawY: number) => {
      const mode = modeRef.current;
      if (mode.kind === "idle") {
        // Empty-space tap (no drag) clears the selection; an empty drag panned.
        if (pendingDeselectRef.current && !pressRef.current.moved) selectShape(null);
        pendingDeselectRef.current = false;
        return;
      }

      // Tap on a wall node (pressed and released without dragging): open the
      // thickness editor instead of committing the no-op endpoint "resize".
      if (mode.kind === "resize" && !pressRef.current.moved && onNodeTap) {
        const tapped = shapes[mode.shapeId];
        if (tapped && (tapped.type === "wall" || tapped.type === "arc-wall")) {
          onNodeTap(mode.shapeId, mode.handle);
          modeRef.current = { kind: "idle" };
          dragSnapshotRef.current = null;
          setPreviewShape(null);
          setConnectedPreviews({});
          setHints(EMPTY_HINTS);
          return;
        }
      }

      // Commit the primary shape
      const shape = shapes[mode.shapeId];
      if (shape && previewShape) {
        const { id: _id, ...patch } = previewShape as Shape;
        updateShape(mode.shapeId, patch);
      }

      // Commit all connected shapes that were co-dragged
      for (const [shapeId, patch] of Object.entries(connectedPreviews)) {
        updateShape(shapeId, patch as ShapePatch);
      }

      modeRef.current = { kind: "idle" };
      dragSnapshotRef.current = null;
      setPreviewShape(null);
      setConnectedPreviews({});
      setHints(EMPTY_HINTS);
    },
    [shapes, previewShape, connectedPreviews, updateShape, onNodeTap, selectShape],
  );

  /** Abort an in-progress move/resize/rotate without committing it. */
  const cancel = useCallback(() => {
    modeRef.current = { kind: "idle" };
    dragSnapshotRef.current = null;
    pendingDeselectRef.current = false;
    setPreviewShape(null);
    setConnectedPreviews({});
    setHints(EMPTY_HINTS);
  }, []);

  const transformingId = modeRef.current.kind !== "idle" ? modeRef.current.shapeId : null;

  return { previewShape, connectedPreviews, hints, onMouseDown, onMouseMove, onMouseUp, cancel, transformingId, selectedId, hitTest };
};

// ---------------------------------------------------------------------------
// Export rotation handle position so SelectionRenderer can draw the handle
// ---------------------------------------------------------------------------

export { rotationHandlePos };
