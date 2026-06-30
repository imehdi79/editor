/**
 * handleMetrics — selection-handle sizes in SCREEN pixels.
 *
 * These are the single source of truth shared by the hit-test (useTransformEngine)
 * and the visual handles (SelectionRenderer). They are expressed in *screen* px
 * and converted to world px at the use site by dividing by the viewport scale —
 * so handles stay a constant, finger-friendly size at every zoom level instead of
 * shrinking when zoomed out.
 *
 * Coarse (touch/pen) pointers get targets at/above the ~44px platform minimum
 * (Apple HIG 44pt, Material 48dp). Fine (mouse) pointers keep the compact sizes.
 */

import { COARSE_POINTER } from "@/lib/pointer";

/** Drawn radius of an endpoint / rotation handle (screen px). */
export const HANDLE_VISUAL_RADIUS = COARSE_POINTER ? 9 : 5;
/** Pointer hit radius for a handle (screen px). 22 ⇒ a 44px touch target. */
export const HANDLE_HIT_RADIUS = COARSE_POINTER ? 22 : 11;
/**
 * Pointer hit radius for a shape body (screen px). On touch this doubles as the
 * "grab band" for the merged select+pan tool: a single-finger press within this
 * band of a shape grabs (selects/moves) it, and only a press on clearly-empty
 * space falls through to a pan. Sized to the ~44px platform touch target for
 * coarse pointers so a near-miss on a thin wall/line selects instead of silently
 * panning the canvas; thick walls already grab via their half-thickness.
 */
export const BODY_HIT_RADIUS = COARSE_POINTER ? 22 : 8;
/** Distance of the rotation handle from the shape midpoint (screen px). */
export const ROTATE_HANDLE_OFFSET = COARSE_POINTER ? 46 : 30;
/** Stroke width of handle outlines (screen px). */
export const HANDLE_STROKE = COARSE_POINTER ? 2 : 1.5;
