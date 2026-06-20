/**
 * endCaps — registry of free-end cap styles.
 *
 * Mirrors joinStyles: the ONLY place mapping an EndCap to geometry. Each cap
 * takes the end's two face corners `a`→`b` (in polygon winding order), the
 * outward direction (away from the wall body) and the wall half-thickness, and
 * returns the vertices that replace the straight edge between them.
 *
 * Only FREE ends are capped; joined ends keep their mitre cut.
 */

import type { EndCap } from "./junction.types";
import type { Vec2 } from "./geometry";

export type EndCapResolver = (a: Vec2, b: Vec2, outward: Vec2, half: number) => Vec2[];

/** Segments used to approximate the round cap's semicircle. */
const ROUND_SEGMENTS = 10;

/** Flat end flush with the wall endpoint. */
const butt: EndCapResolver = (a, b) => [a, b];

/** Flat end projected outward by half the thickness (stroke "square" cap). */
const square: EndCapResolver = (a, b, out, half) => [
  { x: a.x + out.x * half, y: a.y + out.y * half },
  { x: b.x + out.x * half, y: b.y + out.y * half },
];

/** Semicircular end bulging outward, centred on the wall endpoint. */
const round: EndCapResolver = (a, b, out, half) => {
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const a0 = Math.atan2(a.y - cy, a.x - cx);
  // a and b are antipodal across the node, so the cap is a 180° sweep. Pick the
  // sweep direction whose midpoint points outward.
  const s = Math.cos(a0 + Math.PI / 2) * out.x + Math.sin(a0 + Math.PI / 2) * out.y >= 0 ? 1 : -1;
  const pts: Vec2[] = [a];
  for (let k = 1; k < ROUND_SEGMENTS; k++) {
    const ang = a0 + s * Math.PI * (k / ROUND_SEGMENTS);
    pts.push({ x: cx + half * Math.cos(ang), y: cy + half * Math.sin(ang) });
  }
  pts.push(b);
  return pts;
};

const REGISTRY: Record<EndCap, EndCapResolver> = { butt, round, square };

/** The resolver for an end-cap style. */
export const getEndCap = (cap: EndCap): EndCapResolver => REGISTRY[cap] ?? butt;
