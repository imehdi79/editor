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

/** Committed wall: a real composite (default preset) or a single-thickness wall. */
const shapeDefaults = () => {
  const { defaultWallThickness, defaultWallHeight } = useEditorStore.getState();
  const preset = defaultPreset();
  // presetToPatch supplies assembly/coreStart/coreEnd + thickness (core width).
  return preset
    ? { height: defaultWallHeight, ...presetToPatch(preset) }
    : { thickness: defaultWallThickness, height: defaultWallHeight };
};

export const wallToolDefinition: ToolDefinition = {
  minLength: 10,

  buildGhost: (x1, y1, x2, y2) => ({
    type: "wall",
    x1,
    y1,
    x2,
    y2,
    ...ghostDefaults(),
  }),

  buildShape: (x1, y1, x2, y2) => ({
    type: "wall",
    x1,
    y1,
    x2,
    y2,
    ...shapeDefaults(),
  }),
};
