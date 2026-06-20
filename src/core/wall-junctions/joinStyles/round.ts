/**
 * round — the corner is filleted: the two faces stop at their square corners
 * (the tangent points) and an arc bridges them, centred on the node. The wall
 * bodies end square; the arc fan is filled by the node patch. Mirrors the round
 * end cap. The minor arc is used, so convex corners round outward.
 */

import type { JoinResolver } from "../junction.types";

/** Segments approximating the fillet arc. */
const SEGMENTS = 8;

export const roundJoin: JoinResolver = ({ a, b, nodeX, nodeY }) => {
  const ra = Math.atan2(a.y - nodeY, a.x - nodeX);
  const rb = Math.atan2(b.y - nodeY, b.x - nodeX);
  // Minor arc from a to b (convex corners bulge outward).
  let d = rb - ra;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  const radA = Math.hypot(a.x - nodeX, a.y - nodeY);
  const radB = Math.hypot(b.x - nodeX, b.y - nodeY);

  const vertices = [{ x: a.x, y: a.y }];
  for (let k = 1; k < SEGMENTS; k++) {
    const t = k / SEGMENTS;
    const ang = ra + d * t;
    const rad = radA + (radB - radA) * t; // blend radius for slight thickness diffs
    vertices.push({ x: nodeX + rad * Math.cos(ang), y: nodeY + rad * Math.sin(ang) });
  }
  vertices.push({ x: b.x, y: b.y });
  return { vertices };
};
