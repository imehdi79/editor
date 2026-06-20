---
name: wall-junctions
description: Reference for the 20 wall-junction types in a construction CAD editor — geometry, how to compute each, the scalable registry architecture they plug into, the configurable settings, and how each junction must keep 2D dimensions (and wall height for future 3D) in sync. Read this before touching wall corner/outline rendering, the wall-junctions core module, join styles, or dimension chains.
---

# Wall Junctions — reference

This editor is **construction-first**. A "wall" is not a stroked line — it is a
solid body with thickness, height and per-side construction layers. Where two or
more walls meet, the bodies must resolve into a single clean solid (mitre / butt
/ bevel / round), exactly as a CAD/BIM tool does. This skill is the authoritative
map of every junction case and how the codebase resolves it.

> **Current state of the repo:** walls render as plain `Line` strokes with
> `lineCap="butt"` (`ShapeRenderer.tsx`); corners merely overlap. None of the
> junction geometry below exists yet — this skill defines the target. The
> implementation steps live in `plan.json`.

## Non-negotiable invariants

1. **Construction intent.** No decorative shortcuts. Every junction must be a
   geometrically correct solid suitable for takeoff/dimensions, never a visual
   fudge.
2. **Wall height is carried in 2D now.** `WallShape.height` (default
   `defaultWallHeight` in `editor.store`) is set on creation and editable in 2D
   even though 2D never draws it. Every junction/edit path must **preserve and
   propagate `height`** so the 3D view can extrude it later. Never drop it.
3. **Dimensions move with geometry.** Every junction change shifts the true
   inner/outer wall faces. The dimension layer (`measurementReference`
   centerline/inner/outer), the per-segment dimensions and `dimensionChains.ts`
   must be updated in the same step that adds the junction — never as a later
   patch.
4. **Add/remove a junction type must be trivial.** Junction *kinds* are
   classified by a single classifier; join *styles* live in a registry
   (`Record<JoinStyle, JoinResolver>`). Adding a style = add one file + one
   registry entry. Removing one = delete the file + entry. No `switch` ladders
   sprinkled across the renderer.
5. **Reuse first.** `computeTopology`, `wallAngles`, `wallGeometry`,
   `dimensionChains`, `wallLayers` already exist — build on them. New files only
   when an existing one cannot host the concern.

## Master reference table

Tiers: **core** = needed for a usable construction editor; **BIM** = only when
the project grows toward BIM (curved/composite/3D-height).

### By wall count at the node

| # | Type | When it occurs | Geometry | How to compute | Tier |
|---|------|----------------|----------|----------------|------|
| 1 | Free end (no junction) | A wall end touches no other wall | End closed with butt / round / square cap | `wallEndCap` setting → cap the two face points at the free end | core |
| 2 | L-junction (2 walls) | Two walls meet at a corner, any angle | Outer & inner faces mitre at the angle bisector | Sort the 2 ends by bearing; intersect adjacent face lines → mitre apex per side | core |
| 3 | T-junction (3 walls) | One wall meets the side of another | Through-wall stays continuous; the abutting wall is clipped to the through-wall face | Detect the collinear pair (the through-wall) → butt the third wall to its near face | core |
| 4 | X / cross (4 walls) | Four walls share one node | All four mitre in angular order | Sort 4 ends by bearing; mitre each adjacent pair | core |
| 5 | Star / multi-way (5+) | Radial / irregular plans | Same angular-sort mitre, more apexes | N ends sorted by bearing → mitre each neighbour pair (generalises #2/#4) | core |

### By join geometry

| # | Type | When it occurs | Geometry | How to compute | Tier |
|---|------|----------------|----------|----------------|------|
| 6 | Mitre join | Default for L/X/star | Faces meet on the angle bisector | Intersect the two offset face lines; apex = intersection point | core |
| 7 | Butt join | Wall ends into another's face | One wall ends flush, the other is untouched | Clip the abutting wall's faces at the host wall's face line | core |
| 8 | Bevel join | Sharp angle where mitre is too long | Apex replaced by a straight chamfer | When mitre length > `miterLimit`×half-thickness, cut a straight edge between the two face points | core |
| 9 | Round join | Decorative rounded corner | Apex replaced by a fillet arc | Arc tangent to both faces, radius from setting | BIM |

### Special / rare cases

| # | Type | When it occurs | Geometry | How to compute | Tier |
|----|------|----------------|----------|----------------|------|
| 10 | Acute / sharp angle | Two walls meet at a very small angle | Mitre apex shoots to a spike | Same as #8 — `miterLimit` forces a bevel before the spike forms | core |
| 11 | Collinear continuation | Two walls in a straight line (≈180°) | Acts as one continuous wall | Detect via `COLLINEAR_COS_TOLERANCE`; no mitre — straight pass-through (transition if thickness differs) | core |
| 12 | Thickness mismatch | Thin wall meets thick wall | Faces align flush on one side or centred | `junctionAlign` setting: `flush-left` / `centered` / `flush-right` decides which faces line up | core |
| 13 | Overlap (partial) | Two walls partly lie on each other (user error) | Should merge or warn | Detect collinear + overlapping spans → emit a validation warning (don't auto-delete) | core |
| 14 | Touching, not joined | Walls visually touch but share no node | Visually merged, data-separate | Detect near-coincident faces with no shared topology node → warn / offer join | core |
| 15 | Eccentric / offset join | Centrelines don't meet but walls should join | Join with a per-wall lateral offset | Offset the centreline by `offset` before computing faces; join offset faces | BIM |
| 16 | Mid-span connection | New wall meets the *body* of an existing wall | Host splits into two segments (or a T without split) | Project the new end onto the host; split host at that `t` (reuse `wallGeometry` projection) | core |
| 17 | Curved / arc walls | Straight wall meets an arc wall | Tangent at the contact point | New `arc-wall` shape + tool; join uses the arc tangent direction at the node | BIM |
| 18 | Height mismatch (3D) | Walls meet in plan, differ in height | Invisible in 2D, handled in 3D | Carry `height` per wall (already in model); 3D extrudes each wall to its own height | BIM |
| 19 | Composite / multi-layer | Multi-layer walls meet | Each layer matches its counterpart | Per-layer join: match `wallLayers` bands across the junction, not just the core | BIM |
| 20 | Self-intersecting loop | A wall path crosses itself | Crossing treated as its own junction | Detect segment self-intersections → synthesise a virtual node and classify like #4 | BIM |

## Computation primitives (reuse these)

- **Face lines.** A wall centreline `(x1,y1)→(x2,y2)` with `thickness` has two
  offset face lines at `±thickness/2` along the unit normal `n = (-dy, dx)/len`.
  `wallGeometry.wallNormal` already gives this normal.
- **Bearing / sort key.** `wallAngles.absoluteAngleDeg` gives each wall-end its
  bearing *away from the node*. Sorting ends by bearing is the backbone of #2,
  #4, #5.
- **Included angle.** `wallAngles.includedAngleDeg` gives the corner angle →
  feeds the mitre-vs-bevel decision (#8/#10) and the apex math.
- **Node membership.** `computeTopology` → which ends meet at a node, and
  `nodeKey`/`SNAP_EPSILON` for coincidence. Drives the free/L/T/X/star
  classification.
- **Projection onto a wall.** `wallGeometry.projectOntoWall` → mid-span hit `t`
  for #16, and overlap detection for #13.
- **Line–line intersection.** The mitre apex is the intersection of two offset
  face lines. `dimensionChains.ts` already does face-to-axis intersection with a
  determinant — mirror that pattern.

## Target architecture (where things go)

Keep `core/` framework-free (no React/Konva/store), unit-testable.

```
src/core/wall-junctions/
  junction.types.ts        # JunctionKind, JoinStyle, EndCap, WallNode, WallEnd, JunctionConfig, WallOutline
  classifyJunction.ts      # topology node + meeting ends → JunctionKind (free/L/T/X/star/collinear)
  computeWallOutline.ts    # per-wall solid polygon, using resolved join offset at each end
  joinStyles/
    index.ts               # REGISTRY: Record<JoinStyle, JoinResolver>  ← add/remove a style here
    miter.ts               # mitre apex (default)
    butt.ts                # flush butt
    bevel.ts               # chamfer (also the miter-limit fallback)
    round.ts               # fillet arc
  junctionConfig.ts        # defaults; merges editor.store settings
  index.ts                 # computeWallJunctions(shapes, config) → outlines + node descriptors; WeakMap-cached by `shapes` (mirror computeRoomAreas)
```

`JoinResolver` is one shared signature — given the two adjacent face rays and the
included angle, return the join vertices (apex / chamfer pair / arc). Every style
implements only that. The renderer never branches on style; it asks the registry.

**Renderer change:** `ShapeRenderer.tsx` wall case switches from stroking a
`Line` to filling the polygon from `computeWallJunctions`. Construction layer
bands (`wallLayers.buildWallLayerBands`) move from per-segment butt strokes to
following the mitred outline (fixes the acknowledged corner-gap limitation).

## Configurable settings (editor.store)

Anything an architect may want to change per-project lives in `editor.store`
(with a control in the wall-defaults panel), never hard-coded:

| Setting | Type | Purpose | Junctions |
|---------|------|---------|-----------|
| `wallJoinStyle` | `miter \| butt \| bevel \| round` | Default join | #6–#9 |
| `miterLimit` | number | Spike→bevel threshold | #8, #10 |
| `wallEndCap` | `butt \| round \| square` | Free-end cap | #1 |
| `junctionAlign` | `flush-left \| centered \| flush-right` | Thickness-mismatch alignment | #12 |
| `defaultWallThickness` | number | already exists | all |
| `defaultWallHeight` | number | already exists; carried for 3D | #18 |

Constants that are geometric truths (e.g. `SNAP_EPSILON`,
`COLLINEAR_COS_TOLERANCE`) stay as module constants — only *user choices* go in
the store.

## Dimension coupling (do in the same step)

Every junction step must also update dimensions:

- **Per-segment dims** (`DimensionLayerRenderer`) and the live drag label
  measure from the chosen `measurementReference`. With real mitred faces, the
  inner/outer length is the face-to-face span, not the centreline — recompute
  face endpoints from the junction outline.
- **Dimension chains** (`dimensionChains.ts`) already break runs at T/L
  junctions. When a new junction kind changes where a face actually lands
  (bevel, offset, thickness transition), the chain break-points must use the
  resolved junction point, not the raw centreline projection.
- **Rooms** (`computeRoomAreas`) trace centrelines and are unaffected by join
  *style*, but #16 (split) changes the centreline graph — re-trace.

## Adding a new junction type — checklist

A new **join style** (e.g. `ogee`):
1. `joinStyles/ogee.ts` implementing `JoinResolver`.
2. Register it in `joinStyles/index.ts`.
3. Add the literal to the `JoinStyle` union + the `wallJoinStyle` setting + its UI option.
Done — no renderer or dimension change.

A new **junction kind** (new topology shape):
1. Extend `JunctionKind` + a branch in `classifyJunction.ts`.
2. The outline builder already consumes resolved offsets — usually no change.
3. Verify dimension chains/rooms still derive faces correctly.

Removing either = delete the file/branch + its union member + its setting option.
