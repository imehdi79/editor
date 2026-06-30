/**
 * spaceAssignment — the only space data that is ever persisted.
 *
 * A space (an enclosed room) is a DERIVED runtime entity: its geometry is always
 * re-traced from the wall network and never written into the document. The things
 * worth persisting are the user's choices — the cost assemblies for the floor and
 * ceiling, and a custom room name — keyed by the space's stable id (see
 * {@link Space.id}).
 *
 * Pure data — no React / store / Konva. Lives in `core/` so both the store
 * (which owns the persisted map) and the estimation layer can share the type
 * without a cycle.
 */

/** The user-set choices for one space (every field may be absent). */
export interface SpaceAssignment {
  /** Admin preset id used to cost this space's floor (undefined ⇒ unassigned). */
  floorAssemblyId?: string;
  /** Admin preset id used to cost this space's ceiling (undefined ⇒ unassigned). */
  ceilingAssemblyId?: string;
  /** Custom room name (undefined ⇒ fall back to the numbered "Space N" label). */
  name?: string;
}

/** Persisted assignments keyed by stable space id. */
export type SpaceAssignments = Record<string, SpaceAssignment>;
