# CLAUDE.md

Project guide for AI assistants. Keep this current when architecture changes.

## What this is

A **mobile-first 2D/3D floor-plan / architectural editor**. Users draw walls,
doors, windows, lines and text on an infinite canvas; the app auto-detects
rooms, renders running dimension chains, and produces a takeoff table of wall
construction layers. 2D is the primary view; a 3D view exists but is secondary.

## Stack

- **React 19** + **React Compiler** (`babel-plugin-react-compiler`, applied via
  `@rolldown/plugin-babel` in `vite.config.ts`). Components are auto-memoized —
  **don't add manual `useMemo`/`useCallback`/`memo` unless profiling shows a
  real need**; the compiler handles most of it.
- **Vite 8 (rolldown-vite)** + **Bun** for dev/build.
- **Zustand** for state; **zundo** (`temporal`) for undo/redo on the document.
- **Konva / react-konva** for the 2D canvas.
- **@react-three/fiber + drei + three-stdlib** for 3D — **lazy-loaded** (see Perf).
- **TanStack Query** for the projects/auth API.
- **Tailwind v4** + **radix-ui** + **shadcn** + **vaul** + **lucide-react** for UI.
- **Cloudflare Workers** for hosting (`wrangler`, `@cloudflare/vite-plugin`).
- TypeScript strict; path alias `@/*` → `src/*`; `verbatimModuleSyntax` (use
  `import type`).

## Commands

- `bun run dev` — Vite dev server on **port 3030**.
- `bun run build` — production build. **⚠ Skips `tsc` — no typecheck.**
- `bun run node:build` — `tsc -b && vite build` (use this to typecheck).
- `bun run lint` — ESLint.
- `bun run deploy` — build + `wrangler deploy`.

Before claiming a change compiles, run `npx tsc -b --noEmit` (the default build
won't catch type errors).

## Layout

```
src/
  App.tsx              # auth gate -> Layout + Canvas
  main.tsx             # root, QueryClientProvider, StrictMode
  api/                 # auth API, http client, token store, react-query setup
  services/            # projectsApi
  store/               # zustand stores (see below)
  core/                # pure logic — NO React, NO Konva, NO store
    drawing-engine/    # tool-definition types, useDrawingEngine, resolvePoint
    snapping/          # snapToGrid, snapToPoints, axisLock, perpendicularLock
    guides/            # alignment guides
    topology/          # computeTopology — endpoint connectivity graph
    door/              # computeDoorSwing
    wall-utils/        # wall geometry + angles
    dimensions/        # dimension chains, layout, units, collision
    wall-layers/       # construction layer model + bands + takeoff rows
    drawing-info/      # buildDrawingInfo (takeoff table), computeRoomAreas
  features/            # one folder per tool (wall/door/window/line/text/select)
    tool-registry.ts   # maps tool id -> tool definition
    select-tool/       # useTransformEngine (move/resize/rotate), useSelectionEngine
  renderer/
    2d/                # Konva Stage + all 2D renderers + stage events/viewport
    3d/                # react-three-fiber scene (lazy-loaded)
    layout/            # header, sidebar, panels (DOM UI around the canvas)
    auth/              # AuthScreen
  components/
    canvas/            # picks 2D vs 3D by editor.viewMode (3D lazy)
    ui/                # shadcn-style primitives
```

## State (zustand stores)

- **floor-plan.store** — `shapes: Record<ShapeId, Shape>` (the document).
  Wrapped in zundo `temporal` (100-step undo). Mutations: `addShape`,
  `updateShape`, `removeShape`, `loadShapes`, `reset`. `useTemporalStore` for
  undo/redo.
- **editor.store** — `viewMode` (`2d`/`3d`), `dimensionUnit` (mm/cm/m/px),
  `pixelsPerMeter` (100), snap settings, `measurementReference`
  (centerline/inner/outer), wall defaults, `linkConnectedNodes`.
- **viewport.store** — Stage `x`, `y`, `scale` (pan/zoom). Scale clamp 0.05–20.
- **tools.store** — active `tool` + `TOOL_CURSORS`.
- **selection.store** — `selectedId`.
- **layers.store** — per-discipline visibility (`visibility: Record<SystemCategory, boolean>`). A hidden category's shapes are excluded by the renderer.
- **auth.store** — `status` (`loading`/`authed`/anon), `initialize`.
- **projects.store** / projectsApi — project list + pages.

## Domain model

**System layers:** every shape has an optional `category` (`SystemCategory` in
`core/layers/systemCategories.ts` — architectural/structural/electrical/plumbing/
hvac/roof/furniture/annotation). `categoryOf(shape)` resolves it, defaulting by
type (text → annotation, else architectural); `addShape` stamps it on creation.
The Systems panel toggles visibility per category — hidden categories are not
drawn (ShapeRenderer) and not selectable (hit-test). To patch a shape use the
`ShapePatch` type (a *distributive* `Partial<Omit<…>>`) — a plain
`Partial<Omit<Shape, …>>` collapses to the union's common keys and rejects
variant-specific fields.

`Shape` is a union by `type`: `wall | line | dashed-line | text | window | door`.
Walls/lines/openings are segments (`x1,y1 -> x2,y2`); walls/openings have
`thickness`; walls have `layers` (per-side construction) and `height`. All
coordinates are **world space** (px); the Konva Stage applies viewport x/y/scale.

Key derived computations (all pure, in `core/`):
- **computeTopology(shapes)** — groups endpoints sharing a position (`nodeKey`
  rounds to `SNAP_EPSILON=1px`) so joined walls move together.
- **computeRoomAreas(shapes)** — builds a planar arrangement of wall centerlines,
  traces minimal faces = rooms. **WeakMap-cached by the shapes object** (shared
  across consumers; returns a pre-sorted, read-only array — don't mutate/sort it).
- **dimension chains** (`core/dimensions/`) — running inner/outer dimensions for
  collinear wall runs.

## Important patterns

- **Drag interactions write the store only on commit (mouseUp).** During a drag,
  per-frame updates live in local React state (preview shapes / hints), so the
  expensive derived recomputes (rooms, dimensions, topology) do **not** run every
  frame. Preserve this when adding interactions.
- Because committed `shapes` is stable during a drag, `useTransformEngine`
  **snapshots topology + resolve-config once at drag start** and reuses them per
  frame. Don't reintroduce `computeTopology(shapes)` inside `onMouseMove`.
- `core/` is framework-free and unit-testable; keep React/Konva/store out of it.
- Conventional commits, lowercase: `feat(scope): …`, `perf: …`, `fix(scope): …`.
  Some files carry Persian/Farsi comments (dimensions) — that's intentional.

## Internationalization (i18n)

All user-facing copy goes through `src/i18n` — **no hardcoded UI strings**.

- **Dictionaries** live in `src/i18n/locales/{en,it,de,fa}.ts`. `en` is the
  authoritative shape; the others are typed `: Dictionary` (= `typeof en`), so a
  missing/renamed key is a **compile error**. Add a key to `en` first, then mirror
  it to the other three. Use professional construction/architecture terminology
  (e.g. mitre = Gehrung/Quartabuono/اریب, layers = stratigrafia/Schichten/لایه‌ها),
  not literal translations.
- **Hook:** `const { t, tf, dir } = useTranslation()` (from `@/i18n`).
  `t("settings.title")` — typed dot-path key, autocompleted; `t(key, { count })`
  interpolates `{placeholders}`. `tf(key, fallback)` is for **dynamic** keys not
  known at compile time (material/template ids) — returns `fallback` on a miss.
- Keep `core/` framework-free: it stores **stable ids/keys** (material names,
  `SystemCategory` ids, `WallSide`), and the renderer maps id → label via `t`.
  Don't put display strings in `core/`.
- **Active locale** is `i18n.store` (persisted; mirrors `lang`/`dir` onto `<html>`
  — Persian is RTL). The switcher is in `SettingsPanel`.

## Performance (mobile-first — guard these)

- **3D is lazy-loaded** in `components/canvas/index.tsx` (`React.lazy`). The whole
  `three`/`drei` stack (~223 KB gzip) must stay out of the initial graph — **do
  not statically import `@react-three/*` or `three` from anything reachable on
  first paint.**
- `vite.config.ts` splits `react` / `konva` / `three` / `query` into separate
  cacheable vendor chunks. Initial JS is ~230 KB gzip; the `three` chunk loads
  only when the user opens 3D.
- The 3D `<Canvas>` uses `shadows` + `antialias` — expensive on mobile GPUs;
  gate behind a device check if you invest in 3D.
