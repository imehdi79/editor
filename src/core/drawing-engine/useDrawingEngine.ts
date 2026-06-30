import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/store/editor.store";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { COARSE_POINTER } from "@/lib/pointer";
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

/** A drawn-but-not-yet-committed segment awaiting confirmation (touch only). */
interface PendingSegment {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
}

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
  // Deferred commit: on touch, a finished segment waits for an explicit confirm
  // so the (occluded) endpoint can be checked / nudged first. Never with chain
  // (which flows segment-to-segment), never on a fine pointer (commit on release).
  const deferralActive = COARSE_POINTER && !chainActive && !!toolDef;

  // --- local state ---
  const startRef = useRef<{ x: number; y: number } | null>(null);
  /** Current chain anchor (last committed endpoint) when chaining; else null. */
  const anchorRef = useRef<{ x: number; y: number } | null>(null);
  /** True when the anchor was created on the current press (a starting tap), so a
   *  short release keeps the chain open instead of finishing it. */
  const anchorJustSetRef = useRef(false);
  const [ghost, setGhost] = useState<GhostShape>(null);
  const [hints, setHints] = useState<DrawingHints>(EMPTY_HINTS);
  /** A finished-but-unconfirmed segment (deferred commit); null when none. */
  const [pending, setPending] = useState<PendingSegment | null>(null);

  // Reset any pending confirmation when the tool or chain mode changes — the
  // React-sanctioned "adjust state during render" pattern (refs are reset in the
  // effect below). Prevents a stale confirm bar surviving a tool switch.
  const [seenCtx, setSeenCtx] = useState<{ tool: ToolDefinition | null; chain: boolean }>({
    tool: toolDef,
    chain: chainActive,
  });
  if (seenCtx.tool !== toolDef || seenCtx.chain !== chainActive) {
    setSeenCtx({ tool: toolDef, chain: chainActive });
    if (pending) setPending(null);
  }

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

  const hintsFrom = (r: ReturnType<typeof resolvePoint>): DrawingHints => ({
    snapResult: r.pointSnap.snapped ? r.pointSnap : null,
    guides: r.guides,
    axisLocked: r.axisLocked,
    axisLockAngle: r.axisLockAngle,
    perpLocked: r.perpLocked,
    dimension: r.dimension,
  });

  const onMouseDown = useCallback(
    (rawX: number, rawY: number) => {
      if (!toolDef) return;

      // While a segment awaits confirmation, a press begins adjusting its
      // endpoint (handled in move/up); never start a fresh draw underneath it.
      if (pending) return;

      const { x, y } = resolvePoint(rawX, rawY, makeConfig());

      if (chainActive) {
        if (anchorRef.current === null) {
          anchorRef.current = { x, y };
          anchorJustSetRef.current = true;
          setGhost(toolDef.buildGhost(x, y, x, y));
          setHints(EMPTY_HINTS);
        } else {
          anchorJustSetRef.current = false;
        }
        return;
      }

      startRef.current = { x, y };
      setGhost(toolDef.buildGhost(x, y, x, y));
      setHints(EMPTY_HINTS);
    },
    [toolDef, makeConfig, chainActive, pending],
  );

  const onMouseMove = useCallback(
    (rawX: number, rawY: number) => {
      if (!toolDef) return;

      // Adjusting a pending endpoint: rubber-band from its fixed start.
      if (pending) {
        const res = resolvePoint(rawX, rawY, makeConfig(), pending.sx, pending.sy);
        setGhost(toolDef.buildGhost(pending.sx, pending.sy, res.x, res.y));
        setHints(hintsFrom(res));
        return;
      }

      if (chainActive) {
        const anchor = anchorRef.current;
        const res = resolvePoint(rawX, rawY, makeConfig(), anchor?.x, anchor?.y);
        // With an anchor: rubber-band from it. Without one (chain not yet
        // started, e.g. after a tool switch): clear any stale ghost.
        setGhost(anchor ? toolDef.buildGhost(anchor.x, anchor.y, res.x, res.y) : null);
        setHints(hintsFrom(res));
        return;
      }

      const start = startRef.current;
      const res = resolvePoint(rawX, rawY, makeConfig(), start?.x, start?.y);
      if (start) setGhost(toolDef.buildGhost(start.x, start.y, res.x, res.y));
      setHints(hintsFrom(res));
    },
    [toolDef, makeConfig, chainActive, pending],
  );

  const onMouseUp = useCallback(
    (rawX: number, rawY: number) => {
      if (!toolDef) return;
      const minLength = toolDef.minLength ?? 5;

      // Adjusting a pending endpoint: settle it at the released point, stay pending.
      if (pending) {
        const res = resolvePoint(rawX, rawY, makeConfig(), pending.sx, pending.sy);
        setPending({ sx: pending.sx, sy: pending.sy, ex: res.x, ey: res.y });
        setGhost(toolDef.buildGhost(pending.sx, pending.sy, res.x, res.y));
        setHints(hintsFrom(res));
        return;
      }

      if (chainActive) {
        const anchor = anchorRef.current;
        if (!anchor) return;
        const { x, y } = resolvePoint(rawX, rawY, makeConfig(), anchor.x, anchor.y);
        const dist = Math.hypot(x - anchor.x, y - anchor.y);

        if (dist >= minLength) {
          commitSegment(anchor.x, anchor.y, x, y);
          anchorRef.current = { x, y };
          anchorJustSetRef.current = false;
          setGhost(toolDef.buildGhost(x, y, x, y));
          setHints(EMPTY_HINTS);
        } else if (anchorJustSetRef.current) {
          anchorJustSetRef.current = false;
        } else {
          anchorRef.current = null;
          setGhost(null);
          setHints(EMPTY_HINTS);
        }
        return;
      }

      if (!startRef.current) return;
      const start = startRef.current;
      const res = resolvePoint(rawX, rawY, makeConfig(), start.x, start.y);
      const dist = Math.hypot(res.x - start.x, res.y - start.y);
      startRef.current = null;

      if (dist < minLength) {
        setGhost(null);
        setHints(EMPTY_HINTS);
        return;
      }

      if (deferralActive) {
        // Hold for confirmation instead of committing — the endpoint can be
        // checked / nudged first (touch). No store write until confirm().
        setPending({ sx: start.x, sy: start.y, ex: res.x, ey: res.y });
        setGhost(toolDef.buildGhost(start.x, start.y, res.x, res.y));
        setHints(hintsFrom(res));
      } else {
        commitSegment(start.x, start.y, res.x, res.y);
        setGhost(null);
        setHints(EMPTY_HINTS);
      }
    },
    [toolDef, makeConfig, chainActive, pending, deferralActive, commitSegment],
  );

  /** Commit the pending segment (the confirm affordance). */
  const confirmPending = useCallback(() => {
    if (!pending) return;
    commitSegment(pending.sx, pending.sy, pending.ex, pending.ey);
    setPending(null);
    setGhost(null);
    setHints(EMPTY_HINTS);
  }, [pending, commitSegment]);

  /** Drop the pending segment without committing (the discard affordance). */
  const discardPending = useCallback(() => {
    setPending(null);
    setGhost(null);
    setHints(EMPTY_HINTS);
  }, []);

  /** Abort any in-progress draw/chain/pending without committing (e.g. a
   *  pinch-zoom began or Escape was pressed). */
  const cancel = useCallback(() => {
    startRef.current = null;
    anchorRef.current = null;
    anchorJustSetRef.current = false;
    setPending(null);
    setGhost(null);
    setHints(EMPTY_HINTS);
  }, []);

  // Reset interaction refs on tool change / when chaining turns off — never carry
  // a dangling anchor across tools or modes (e.g. wall → select → wall). Refs
  // only (no setState in the effect); the pending state is reset during render.
  useEffect(() => {
    startRef.current = null;
    anchorRef.current = null;
    anchorJustSetRef.current = false;
  }, [toolDef, chainActive]);

  // Escape finishes the chain / aborts an in-progress draw or pending confirm.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancel]);

  return {
    ghost,
    hints,
    pending: pending !== null,
    confirmPending,
    discardPending,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    cancel,
  };
};
