/**
 * SpacePropertiesForm — the editable property set for a selected space (room).
 *
 * A space is a DERIVED entity: its geometry comes from the wall network and is
 * read-only here. The editable, persisted state is a custom room name plus the
 * floor and ceiling cost assemblies (picked with the same {@link AssemblyPicker}
 * walls use). Edits go to `setSpaceName` / `setSpaceAssembly` (undoable / redoable
 * / persisted) and never touch the shapes, so the geometry is not re-traced.
 */

import { useState } from "react";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { formatArea, formatDimension } from "@/core/dimensions/dimensionUnits";
import type { Space } from "@/core/spaces/computeSpaces";
import { useTranslation } from "@/i18n";
import AssemblyPicker from "./AssemblyPicker";

const SpacePropertiesForm = ({ space }: { space: Space }) => {
  const { t } = useTranslation();
  const unit = useEditorStore((s) => s.dimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const assignment = useFloorPlanStore((s) => s.spaceAssignments[space.id]);
  const setSpaceAssembly = useFloorPlanStore((s) => s.setSpaceAssembly);
  const setSpaceName = useFloorPlanStore((s) => s.setSpaceName);

  // Local draft committed on blur / Enter, so a rename is ONE undo step (not one
  // per keystroke). Re-seed when the selected space changes (adjust-during-render).
  const [draft, setDraft] = useState(assignment?.name ?? "");
  const [seenId, setSeenId] = useState(space.id);
  if (seenId !== space.id) {
    setSeenId(space.id);
    setDraft(assignment?.name ?? "");
  }
  const commitName = () => setSpaceName(space.id, draft.trim() || undefined);

  const rows: [string, string][] = [
    [t("space.netArea"), formatArea(space.netAreaPx / (ppm * ppm))],
    [t("space.netPerimeter"), formatDimension(space.perimeterPx, unit, ppm)],
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Custom room name — overrides the numbered "Space N" canvas label. */}
      <label className="flex flex-col gap-1.5">
        <span className="text-2xs uppercase tracking-wider text-ink-3 mono">{t("space.name")}</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            else if (e.key === "Escape") setDraft(assignment?.name ?? "");
          }}
          placeholder={t("space.namePlaceholder")}
          className="h-9 rounded-md border bg-background px-2 text-sm outline-none focus-visible:border-ring"
        />
      </label>

      <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium tabular-nums">{value}</span>
          </div>
        ))}
      </div>

      {/* Cost assemblies — independent per surface, persisted on the document */}
      <div className="flex flex-col gap-3 border-t pt-3">
        <AssemblyPicker
          elementType="floor"
          value={assignment?.floorAssemblyId}
          onChange={(id) => setSpaceAssembly(space.id, "floor", id)}
          label={t("space.floorAssembly")}
        />
        <AssemblyPicker
          elementType="ceiling"
          value={assignment?.ceilingAssemblyId}
          onChange={(id) => setSpaceAssembly(space.id, "ceiling", id)}
          label={t("space.ceilingAssembly")}
        />
      </div>
    </div>
  );
};

export default SpacePropertiesForm;
