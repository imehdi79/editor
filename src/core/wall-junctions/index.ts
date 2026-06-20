/**
 * wall-junctions — public entry point.
 *
 * `computeWallJunctions` classifies wall nodes (free / L / collinear / T / X /
 * star). `computeWallOutlines` turns that classification + the user's join style
 * into a solid body polygon per wall. Both are cached so every consumer in a
 * render pass shares one result.
 *
 * Pure — no React, no Konva, no store.
 */

export * from "./junction.types";
export { DEFAULT_JUNCTION_CONFIG } from "./junctionConfig";
export { getJoinResolver } from "./joinStyles";
export { intersectLines, type Vec2 } from "./geometry";
export { computeWallJunctions, junctionAt } from "./computeWallJunctions";
export { computeWallOutlines, computeJunctionPatches, type WallOutline, type WallOutlineMap } from "./computeWallOutline";
export { resolveMidSpanSplits, type WallSplit, type MidSpanResult } from "./splitHost";
export { detectWallIssues, type WallIssue, type WallIssueKind } from "./wallIssues";
