/**
 * bevel — the corner is chamfered: the two faces stop at their square corners
 * and a straight edge bridges them. The wall bodies end square; the chamfer gap
 * is filled by the node patch (computeWallOutline). Used both as an explicit
 * join style and as the mitre's sharp-angle fallback.
 */

import type { JoinResolver } from "../junction.types";

export const bevelJoin: JoinResolver = ({ a, b }) => ({
  vertices: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }],
});
