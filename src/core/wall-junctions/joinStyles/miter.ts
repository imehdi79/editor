/**
 * miter — the default join. The two bounding faces are extended until they meet
 * at the angle bisector; that single apex closes the wedge.
 *
 * Sharp angles make the apex shoot far past the corner (a mitre spike). When the
 * spike length exceeds `miterLimit × half-thickness` the apex is dropped in
 * favour of the two square face corners — i.e. the corner bevels, the standard
 * CAD/SVG behaviour. Parallel faces (a straight collinear pass-through) likewise
 * close straight across.
 */

import type { JoinResolver } from "../junction.types";
import { intersectLines } from "../geometry";

export const miterJoin: JoinResolver = ({ a, b, nodeX, nodeY, miterLimit }) => {
  const bevel = { vertices: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }] };
  const apex = intersectLines(a.x, a.y, a.dx, a.dy, b.x, b.y, b.dx, b.dy);
  if (!apex) return bevel;

  const halfA = Math.hypot(a.x - nodeX, a.y - nodeY);
  const halfB = Math.hypot(b.x - nodeX, b.y - nodeY);
  const maxHalf = Math.max(halfA, halfB) || 1;
  const spike = Math.hypot(apex.x - nodeX, apex.y - nodeY) / maxHalf;
  if (spike > miterLimit) return bevel;

  return { vertices: [apex] };
};
