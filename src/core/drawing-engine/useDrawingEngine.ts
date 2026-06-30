import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/store/editor.store";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { resolvePoint, type ResolveConfig } from "./resolvePoint";
import { resolveMidSpanSplits } from "@/core/wall-junctions";
import type { GhostShape, DrawingHints } from "./drawing.types";
import type { ToolDefinition } from "./tool-definition.types";
import type { WallShape } from "./drawing.types";

const EMPTY_HINTS: DrawingHints = {
  snapResult: null,
  guides: [],
  axisLocked: false,
  axisLockAngle: null,
  perpLocked: false,
  dimension: null,
};

export const useDrawingEngine = (toolDef: ToolDefinition | null) => {
  // --- store subscriptions ---
  const snapGrid = useEditorStore((s) => s.snapGrid);
  const axisAngleThreshold = useEditorStore((s) => s.axisAngleThreshold);
  const snapRadius = useEditorStore((s) => s.snapRadius);
  const guideThreshold = useEditorStore((s) => s.guideThreshold);
  const perpThreshold = useEditorStore((s) => s.perpThreshold);
  const dimensionUnit = useEditorStore((s) => s.dimensionUnit);
  const pixelsPerMeter = useEditorStore((s) => s.pixelsPerMeter);
  const chainDrawing = useEditorStore((s) => s.chainDrawing);
  const shapes = useFloorPlanStore((s) => s.shapes);
  const addShape = useFloorPlanStore((s) => s.addShape);
  const addShapeWithSplits = useFloorPlanStore((s) => s.addShapeWithSplits);

  // Continuous drawing is only active for tools that opt in (segment tools).
  const chainActive = chainDrawing && !!toolDef?.chainable;

  // --- local state ---
  const startRef = useRef<{ x: number; y: number } | null>(null);
  /** Current chain anchor (last committed endpoint) when chaining; else null. */
  const anchorRef = useRef<{ x: number; y: number } | null>(null);
  /** True when the anchor was created on the current press (a starting tap), so a
   *  short release keeps the chain open instead of finishing it. */
  const anchorJustSetRef = useRef(false);
  const [ghost, setGhost] = useState<GhostShape>(null);
  const [hints, setHints] = useState<DrawingHints>(EMPTY_HINTS);

  /**
   * Build the ResolveConfig from current store values.
   * Inlined as a helper so the config object is always fresh inside each
   * callback without adding it to the dep arrays (same values are already
   * captured via the individual store subscriptions above).
   */
  const makeConfig = useCallback(
    (): ResolveConfig => ({
      snapGrid,
      axisAngleThreshold,
      snapRadius,
      guideThreshold,
      perpThreshold,
      dimensionUnit,
      pixelsPerMeter,
      shapes,
    }),
    [snapGrid, axisAngleThreshold, snapRadius, guideThreshold, perpThreshold, dimensionUnit, pixelsPerMeter, shapes],
  );

  /** Commit one segment, splitting a host wall into a T when an endpoint lands
   *  mid-span (one atomic undo step) — shared by the one-shot and chain paths. */
  const commitSegment = useCallback(
    (sx: number, sy: number, ex: number, ey: number) => {
      if (!toolDef) return;
      const shape = toolDef.buildShape(sx, sy, ex, ey);
      if (shape.type === "wall") {
        const { wall, splits } = resolveMidSpanSplits(shape as Omit<WallShape, "id">, shapes);
        if (splits.length > 0) addShapeWithSplits(wall, splits);
        else addShape(wall);
      } else {
        addShape(shape);
      }
    },
    [toolDef, shapes, addShape, addShapeWithSplits],
  );

  const onMouseDown = useCallback(
    (rawX: number, rawY: number) => {
      if (!toolDef) return;
      const { x, y } = resolvePoint(rawX, rawY, makeConfig());

      if (chainActive) {
        if (anchorRef.current === null) {
          // First point of a new chain — begin from this press.
          anchorRef.current = { x, y };
          anchorJustSetRef.current = true;
          setGhost(toolDef.buildGhost(x, y, x, y));
          setHints(EMPTY_HINTS);
        } else {
          // A continuing point — the anchor already exists; the segment is
          // previewed from it and committed on release.
          anchorJustSetRef.current = false;
        }
        return;
      }

      startRef.current = { x, y };
      setGhost(toolDef.buildGhost(x, y, x, y));
      setHints(EMPTY_HINTS);
    },
    [toolDef, makeConfig, chainActive],
  );

  const onMouseMove = useCallback(
    (rawX: number, rawY: number) => {
      if (!toolDef) return;

      if (chainActive) {
        const anchor = anchorRef.current;
        const res = resolvePoint(rawX, rawY, makeConfig(), anchor?.x, anchor?.y);
        // With an anchor: rubber-band from it. Without one (chain not yet
        // started, e.g. after a tool switch): clear any stale ghost.
        setGhost(anchor ? toolDef.buildGhost(anchor.x, anchor.y, res.x, res.y) : null);
        setHints({
          snapResult: res.pointSnap.snapped ? res.pointSnap : null,
          guides: res.guides,
          axisLocked: res.axisLocked,
          axisLockAngle: res.axisLockAngle,
          perpLocked: res.perpLocked,
          dimension: res.dimension,
        });
        return;
      }

      const start = startRef.current;
      const { x, y, pointSnap, guides, axisLocked, axisLockAngle, perpLocked, dimension } = resolvePoint(
        rawX,
        rawY,
        makeConfig(),
        start?.x,
        start?.y,
      );

      if (start) {
        setGhost(toolDef.buildGhost(start.x, start.y, x, y));
      }

      setHints({
        snapResult: pointSnap.snapped ? pointSnap : null,
        guides,
        axisLocked,
        axisLockAngle,
        perpLocked,
        dimension,
      });
    },
    [toolDef, makeConfig, chainActive],
  );

  const onMouseUp = useCallback(
    (rawX: number, rawY: number) => {
      if (!toolDef) return;
      const minLength = toolDef.minLength ?? 5;

      if (chainActive) {
        const anchor = anchorRef.current;
        if (!anchor) return;
        const { x, y } = resolvePoint(rawX, rawY, makeConfig(), anchor.x, anchor.y);
        const dist = Math.hypot(x - anchor.x, y - anchor.y);

        if (dist >= minLength) {
          // Commit this segment and continue the chain from its endpoint.
          commitSegment(anchor.x, anchor.y, x, y);
          anchorRef.current = { x, y };
          anchorJustSetRef.current = false;
          setGhost(toolDef.buildGhost(x, y, x, y));
          setHints(EMPTY_HINTS);
        } else if (anchorJustSetRef.current) {
          // The starting tap — keep the anchor open, wait for the next point.
          anchorJustSetRef.current = false;
        } else {
          // A tap in place while chaining — finish the chain.
          anchorRef.current = null;
          setGhost(null);
          setHints(EMPTY_HINTS);
        }
        return;
      }

      if (!startRef.current) return;
      const start = startRef.current;
      const { x, y } = resolvePoint(rawX, rawY, makeConfig(), start.x, start.y);
      const dist = Math.hypot(x - start.x, y - start.y);

      if (dist >= minLength) {
        commitSegment(start.x, start.y, x, y);
      }

      startRef.current = null;
      setGhost(null);
      setHints(EMPTY_HINTS);
    },
    [toolDef, makeConfig, chainActive, commitSegment],
  );

  /** Abort any in-progress draw/chain without committing (e.g. a pinch-zoom began
   *  or Escape was pressed). */
  const cancel = useCallback(() => {
    startRef.current = null;
    anchorRef.current = null;
    anchorJustSetRef.current = false;
    setGhost(null);
    setHints(EMPTY_HINTS);
  }, []);

  // Reset on tool change / when chaining turns off — never carry a dangling
  // anchor across tools or modes (e.g. wall → select → wall). Refs only (no
  // setState in the effect); a stale ghost is cleared lazily by the next move /
  // press, or simply not rendered for non-drawing tools.
  useEffect(() => {
    startRef.current = null;
    anchorRef.current = null;
    anchorJustSetRef.current = false;
  }, [toolDef, chainActive]);

  // Escape finishes the chain / aborts an in-progress draw.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancel]);

  return { ghost, hints, onMouseDown, onMouseMove, onMouseUp, cancel };
};
