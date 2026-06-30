/**
 * SpacePropertiesForm — the editable property set for a selected space (room).
 *
 * A space is a DERIVED entity: its geometry comes from the wall network and is
 * read-only here. The only editable, persisted state is the floor and ceiling
 * cost assemblies, picked with the same {@link AssemblyPicker} walls use. Edits go
 * to `setSpaceAssembly` (undoable / redoable / persisted, independent surfaces)
 * and never touch the shapes, so the geometry is not re-traced.
 */

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

  const rows: [string, string][] = [
    [t("space.netArea"), formatArea(space.netAreaPx / (ppm * ppm))],
    [t("space.netPerimeter"), formatDimension(space.perimeterPx, unit, ppm)],
  ];

  return (
    <div className="flex flex-col gap-4">
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
