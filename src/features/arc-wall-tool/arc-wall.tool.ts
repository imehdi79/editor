import type { ToolDefinition } from "@/core/drawing-engine/tool-definition.types";
import { useEditorStore } from "@/store/editor.store";
import { ASSEMBLY_PRESETS, presetToPatch, coreWidth } from "@/core/wall-layers/wallAssemblyPresets";

/** Resolve the active default preset (null → plain single-thickness wall). */
const defaultPreset = () => {
  const id = useEditorStore.getState().defaultAssemblyPreset;
  return id ? (ASSEMBLY_PRESETS.find((p) => p.id === id) ?? null) : null;
};

/** Thickness for the live preview — the preset's core width, else the default. */
const ghostDefaults = () => {
  const { defaultWallThickness, defaultWallHeight } = useEditorStore.getState();
  const preset = defaultPreset();
  const thickness = preset ? coreWidth(preset.layers, preset.coreStart, preset.coreEnd) : defaultWallThickness;
  return { thickness, height: defaultWallHeight };
};

/** Committed arc: a real composite (default preset) or a single-thickness wall —
 *  the same assembly/preset model as the straight wall tool. */
const shapeDefaults = () => {
  const { defaultWallThickness, defaultWallHeight } = useEditorStore.getState();
  const preset = defaultPreset();
  return preset
    ? { height: defaultWallHeight, ...presetToPatch(preset) }
    : { thickness: defaultWallThickness, height: defaultWallHeight };
};

/** Default bulge for a freshly drawn arc: a quarter of the chord, bowing left. */
const defaultBulge = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1) * 0.25;

export const arcWallToolDefinition: ToolDefinition = {
  minLength: 10,

  buildGhost: (x1, y1, x2, y2) => ({
    type: "arc-wall",
    x1,
    y1,
    x2,
    y2,
    bulge: defaultBulge(x1, y1, x2, y2),
    ...ghostDefaults(),
  }),

  buildShape: (x1, y1, x2, y2) => ({
    type: "arc-wall",
    x1,
    y1,
    x2,
    y2,
    bulge: defaultBulge(x1, y1, x2, y2),
    ...shapeDefaults(),
  }),
};
