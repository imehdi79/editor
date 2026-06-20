/**
 * miter — the default join. The two bounding faces are extended until they meet
 * at the angle bisector; that single apex closes the wedge.
 *
 * When the faces are parallel (a straight collinear pass-through, or a 180°
 * wedge) there is no finite apex, so the wedge is closed straight across by the
 * two face corners — exactly the continuation behaviour a straight run wants.
 */

import type { JoinResolver } from "../junction.types";
import { intersectLines } from "../geometry";

export const miterJoin: JoinResolver = ({ a, b }) => {
  const apex = intersectLines(a.x, a.y, a.dx, a.dy, b.x, b.y, b.dx, b.dy);
  if (!apex) {
    return { vertices: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }] };
  }
  return { vertices: [apex] };
};
