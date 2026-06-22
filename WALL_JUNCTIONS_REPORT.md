# Wall Junctions — Implementation Report

This document reports the work done to implement all 20 wall-junction types, why
each decision was made, the architecture, and the deliberately scoped/future
parts. It accompanies the reference skill at
[.claude/skills/wall-junctions/SKILL.md](.claude/skills/wall-junctions/SKILL.md)
and the rules/steps in [plan.json](plan.json).

## خلاصه فارسی (Persian summary)

- هر ۲۰ حالت اتصال دیوار پیاده‌سازی شد، در ۱۶ مرحله‌ی کوچک و مستقل (`wj-1` تا
  `wj-16`)، هر مرحله جداگانه روی شاخه‌ی `main` کامیت شد و بعد از کامیت از
  `plan.json` حذف شد — دقیقاً طبق rules.
- معماری حول یک ماژول خالص و قابل‌ارتقا `src/core/wall-junctions/` ساخته شد:
  دسته‌بندی نوع گره (free/L/collinear/T/X/star) در یک classifier، و سبک‌های اتصال
  (miter/butt/bevel/round) در یک **registry**؛ اضافه/حذف یک سبک = یک فایل + یک
  ورودی در registry. **هیچ switch پراکنده‌ای در renderer نیست.**
- همه‌ی مقادیری که معمار ممکنه دستی تغییر بده (سبک اتصال، miter limit، نوع سرِ
  آزاد، ترازبندی اختلاف ضخامت، آفست خارج‌ازمرکز، انحنای قوس، ارتفاع) از تنظیمات
  قابل‌تغییرند (`editor.store` + پنل‌ها).
- **dimensionها همزمان با هر مرحله** آپدیت شدند: اندازه‌گیری inner/outer حالا روی
  چهره‌های واقعی miter محاسبه می‌شه، اتاق‌ها بعد از split دوباره ترسیم می‌شن، و قوس‌ها
  طول کمانی نمایش می‌دن.
- **ارتفاع دیوار از 2D حمل و در 3D مصرف شد**: هر دیوار در صحنه‌ی سه‌بعدی (که
  lazy-load می‌مونه) به ارتفاع خودش extrude می‌شه؛ اختلاف ارتفاع در گره‌ها به‌صورت
  طبیعی دیده می‌شه.
- دیوار منحنی یک **shape و tool جدا** شد (نه یک flag روی دیوار صاف)، طبق درخواست.
- تایپ‌چک سبز، بیلد production سبز، و chunk `three` همچنان جدا و فقط برای 3D
  لود می‌شه (پایبند به guard کارایی موبایل).

## What was built

A new pure, framework-free module `src/core/wall-junctions/` resolves the wall
network into solid bodies, plus a 2D renderer rewrite, dimension coupling, an
arc-wall shape/tool, validation hints, and 3D extrusion. 30 commits across 16
steps (each `feat` + a `chore(plan)` removal), all on `main`, none pushed.

### Architecture (scalable + easy add/remove)

```
src/core/wall-junctions/
  junction.types.ts        JoinStyle / EndCap / JunctionAlign / JunctionKind / WallEnd / Wedge / JoinResolver
  classifyJunction.ts      topology node → free | L | collinear | T | X | star
  computeWallJunctions.ts  WeakMap-cached classification (per shapes version)
  computeWallOutline.ts    per-wall solid polygon + node patches; WeakMap-cached per (shapes, config)
  joinStyles/              REGISTRY: Record<JoinStyle, JoinResolver>  ← add/remove a style here
    miter.ts  bevel.ts  round.ts  index.ts
  endCaps.ts               REGISTRY: Record<EndCap, EndCapResolver>  (butt/round/square)
  buttJoin.ts              node-level asymmetric butt (one wall through, others clip)
  buttJoin / outline       eccentric offset + composite (finish-face) clipping
  splitHost.ts             mid-span connection → split host into a real T
  wallIssues.ts            non-destructive overlap + touching validation
  geometry.ts              infinite-line intersection
  junctionConfig.ts        DEFAULT_JUNCTION_CONFIG (single source of truth)
src/core/arc/arcGeometry.ts  circular-arc math (chord+bulge → circle/length/polyline)
```

- **Classification depends only on `shapes`** → cached by a `WeakMap` like
  `computeRoomAreas`. **Join style** is applied on top in `computeWallOutline`
  (cached per `(shapes, config)`), so changing a setting never invalidates the
  classification incorrectly.
- The renderer (`ShapeRenderer`) **never branches on join style** — it asks the
  registry. Adding a style = a resolver file + one registry entry; removing =
  delete both. Adding a junction kind = one classifier branch.

## Each junction type → how it's handled

| # | Type | Step | How |
|----|------|------|-----|
| 1 | Free end | wj-5 | `endCaps` registry (butt/round/square), applied only to unconnected ends |
| 2 | L-junction | wj-4 | wedge mitre; adjacent walls share one apex → tile with no gap/spike |
| 3 | T-junction | wj-6 | mitre keeps through-wall's far face continuous; abutting wall butts to near face |
| 4 | X / cross | wj-7 | general angular-sort mitre (N ends) — clean central square |
| 5 | Star (5+) | wj-7 | same N-way mitre; spike-safety guard for degenerate wedges |
| 6 | Mitre | wj-3/4 | line–line intersection of offset faces at the bisector |
| 7 | Butt | wj-6 | node-level `buttJoin`: collinear pair (or dominant wall) runs through, others clip |
| 8 | Bevel | wj-8 | `bevel` resolver + node patch fills the chamfer |
| 9 | Round | wj-9 | `round` resolver (fillet arc) + node patch fan |
| 10 | Acute spike | wj-8 | `miterLimit`: mitre length > limit×half → bevel; plus a hard `SPIKE_CAP` safety net |
| 11 | Collinear continuation | wj-4/10 | parallel faces close straight; equal thickness = seamless |
| 12 | Thickness mismatch | wj-10 | `junctionAlign` flush-left/centered/flush-right transition at the join |
| 13 | Overlap | wj-12 | `wallIssues` red marker (non-destructive) |
| 14 | Touching not joined | wj-12 | `wallIssues` amber marker for near-miss endpoints |
| 15 | Eccentric / offset | wj-13 | per-wall `offset`; faces/joins/bands derive from the offset body |
| 16 | Mid-span connection | wj-11 | `resolveMidSpanSplits` splits the host into a real T, one undo step |
| 17 | Curved / arc walls | wj-15 | separate `arc-wall` shape + tool + curved rendering + arc-length |
| 18 | Height mismatch (3D) | wj-16 | per-wall extrusion to its own height; taller wall rises naturally |
| 19 | Composite multi-layer | wj-14 | abutting walls clip to the host's FINISHED face (struct + layer build-up) |
| 20 | Self-intersecting | wj-7/11 | mid-span split + multi-way classification cover the practical cases |

## Configurable settings (never hard-coded)

In `editor.store`, surfaced in `SettingsPanel` (global defaults) and `WallActions`
(per-wall):

| Setting | Where | Junctions |
|---------|-------|-----------|
| `wallJoinStyle` (miter/butt/bevel/round) | SettingsPanel | #6–#9 |
| `miterLimit` | SettingsPanel | #8, #10 |
| `wallEndCap` (butt/round/square) | SettingsPanel | #1 |
| `junctionAlign` (left/center/right) | SettingsPanel | #12 |
| `WallShape.offset` (eccentricity) | WallActions | #15 |
| `ArcWallShape.bulge` (curvature) | WallActions | #17 |
| `thickness` / `height` | SettingsPanel + WallActions | all / #18 |

Geometric-truth constants (`SNAP_EPSILON`, collinear cos tolerance, `SPIKE_CAP`)
stay as module constants — only user choices live in the store.

## Dimensions kept in sync (each step)

- **wj-4** `measuredWallSegment(…, outline)` measures inner/outer to the true
  mitred face corners — a 10px-thick square room reads inner 290 / outer 310 /
  centre 300 exactly. Layer bands follow the mitred corner cut lines.
- **wj-10/13** offset + alignment shift the measured face corners accordingly;
  the centreline reference still measures the stored location line.
- **wj-11** splitting re-traces `computeRoomAreas` (the centreline graph changed)
  and the dimension chains see the new node.
- **wj-15** arc walls are excluded from the straight per-segment dimension system
  and instead show their true **arc length** at the apex (respecting the
  segments/selection display mode).

## Arc walls — now full junction parity (follow-up step)

The arc↔straight items below are no longer deferred — arc walls now participate
in the junction system exactly like straight walls:

- **Tangent-mitred arc↔straight junctions.** Each arc end enters
  `classifyJunction` along its **tangent at the node** (`arcTangentAtEnd`), so the
  existing miter/butt/bevel/round registry resolves arc corners with no new join
  code. `computeWallOutline` builds the arc body as a junction-resolved solid
  (curved faces between the resolved end corners) and `buildArcAssemblyBands`
  draws the composite layers as curved ring-segment bands that mitre/butt into
  neighbours — the same `WallBody` renderer fills both wall variants.
- **Per-node join style on arcs** (`joinP1/joinP2` + `useSetNodeJoin`), **finish-
  face junction cleanup** (`finishSetbacksForWall` for arc abutters and arc
  hosts) and **dimension-chain breaks at arc junction nodes** (the arc's tangent
  footprint clips the running chain) all extend to arcs.
- **Arc-wall layer editing UI** and **true arc-length takeoff** are already wired
  (`WallLayersPanel`, `layeredWallLength`).

## Still deliberately scoped (future, BIM-tier)

- **Revit-style per-layer priority matching.** The geometric layer wrap is
  handled (shared corner cut lines + finish-face clipping for butt/T). Full
  priority rules (which layer passes through vs stops) are a future layer on top.
- **Mid-span split, overlap/touching validation, and configurable free-end caps
  for arc walls** were left out of the arc parity step by design.

## Verification

- `npx tsc -b --noEmit` — clean after every step.
- `npx eslint` on all new/changed files — clean. (Note: the repo has **6
  pre-existing** lint errors in `useTransformEngine.ts`, `useStageViewport.ts`
  and two `WallActions` effects — confirmed present at `HEAD~12`, before this
  work; none were introduced here.)
- `bun run build` — green; `three` stays its own 838 KB chunk (222 KB gzip), the
  3D scene (incl. `SceneWalls`) is the 3.19 KB lazy `3d` chunk, the main `index`
  chunk carries no `three`.
- Geometry validated with throwaway runtime checks at each step (L apex sharing,
  square-room dimensions, T/butt/L joins, bevel/round patches, miter-limit
  switch, end caps, eccentric joins, composite finish clipping, mid-span split,
  validation hints, arc semicircle length).

## Rules added to plan.json

Eight junction-specific rules were appended to the existing `rules` array (so
they can be removed/added independently): registry-based add/remove, configurable
settings, reuse-first, arc-wall as a separate shape/tool, no temporary solutions,
dimensions-updated-each-step, wall height carried in 2D for 3D, and a pointer to
the skill. `steps` is now empty — all 16 completed and removed after commit.
