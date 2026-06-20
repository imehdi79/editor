/**
 * junction.types — shared vocabulary for the wall-junction system.
 *
 * A wall is a solid body (thickness + height + per-side layers), not a stroked
 * line. Where wall ends meet at a topology node they must resolve into one clean
 * solid. This file defines:
 *
 *   • the user-configurable choices (JoinStyle / EndCap / JunctionAlign) that
 *     live in editor.store — see the wall-junctions skill for why each is a
 *     setting and not a constant;
 *   • the classified shapes a node can take (JunctionKind);
 *   • the per-end and per-node descriptors the geometry builders consume.
 *
 * Pure types — no React, no Konva, no store.
 */

import type { ShapeId } from "@/core/drawing-engine/drawing.types";

// ---------------------------------------------------------------------------
// Configurable choices (mirrored in editor.store)
// ---------------------------------------------------------------------------

/** How two wall faces resolve at a corner. Registry-backed (joinStyles/). */
export type JoinStyle = "miter" | "butt" | "bevel" | "round";

/** How a free (unconnected) wall end is closed. */
export type EndCap = "butt" | "round" | "square";

/** Which faces line up when two joined walls differ in thickness. */
export type JunctionAlign = "flush-left" | "centered" | "flush-right";

/** The resolved set of user choices a geometry builder needs. */
export interface JunctionConfig {
  joinStyle: JoinStyle;
  /** Sharp-angle threshold: mitre longer than miterLimit×(thickness/2) → bevel. */
  miterLimit: number;
  endCap: EndCap;
  align: JunctionAlign;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/**
 * The topological shape of a node, by how many wall ends meet there:
 *   free      — 1 end, no junction (gets an end cap)
 *   L         — 2 ends at an angle (corner)
 *   collinear — 2 ends in a straight line (continuation / transition)
 *   T         — 3 ends
 *   X         — 4 ends
 *   star      — 5+ ends
 */
export type JunctionKind = "free" | "L" | "collinear" | "T" | "X" | "star";

/** One wall end arriving at a node. */
export interface WallEnd {
  wallId: ShapeId;
  /** Which endpoint of the wall sits on the node. */
  handle: "p1" | "p2";
  /** The wall's structural thickness in px. */
  thickness: number;
  /** Lateral eccentricity of the body from the centreline, along the wall +n. */
  offset: number;
  /** Total construction-layer build-up on the inner (+n) / outer (−n) face. */
  buildupInner: number;
  buildupOuter: number;
  /** Unit direction pointing AWAY from the node, into the wall body. */
  dirX: number;
  dirY: number;
  /** Bearing of that direction, East = 0°, CCW positive, range [0, 360). */
  bearing: number;
}

/** A topology node classified into a junction, with its ends sorted by bearing. */
export interface ClassifiedJunction {
  /** Stable node key (from computeTopology). */
  key: string;
  /** Node position in canvas space. */
  x: number;
  y: number;
  kind: JunctionKind;
  /** Wall ends at this node, sorted by ascending bearing. */
  ends: WallEnd[];
}

/** Map from node key → classified junction. */
export type JunctionMap = Map<string, ClassifiedJunction>;

// ---------------------------------------------------------------------------
// Join-style resolution (registry vocabulary — see joinStyles/)
// ---------------------------------------------------------------------------

/**
 * A wall face line at a node: the wall's face corner (where a square cut would
 * place it) plus the unit direction the face runs (the wall direction away from
 * the node).
 */
export interface FaceRay {
  /** Face corner at the node. */
  x: number;
  y: number;
  /** Unit direction of the face line (away from the node). */
  dx: number;
  dy: number;
}

/**
 * The angular gap between two angularly-adjacent walls at a node, bounded by one
 * face from each. `a` is the clockwise-side face, `b` the counter-clockwise-side
 * face. A join resolver fills this gap.
 */
export interface Wedge {
  nodeX: number;
  nodeY: number;
  a: FaceRay;
  b: FaceRay;
  /** Interior angle of the wedge in degrees (0, 360). */
  angleDeg: number;
  /** Sharp-angle threshold (mitre length ÷ half-thickness) → bevel above it. */
  miterLimit: number;
}

/** The corner point(s) that close a wedge, ordered from a's side to b's side. */
export interface JoinResult {
  vertices: { x: number; y: number }[];
}

/** A join-style implementation: a wedge → its closing vertices. */
export type JoinResolver = (wedge: Wedge) => JoinResult;
