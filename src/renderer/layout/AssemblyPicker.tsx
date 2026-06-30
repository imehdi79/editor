/**
 * AssemblyPicker — the shared "cost assembly" selector used by both the wall
 * inspector and the space (floor/ceiling) inspector.
 *
 * Lists the admin presets scoped to one element type plus a "None" option, so a
 * wall, floor or ceiling all pick their estimation assembly from the same
 * control. Pure presentation over a controlled value — the caller persists the
 * choice (e.g. `updateShape` for walls, `setSpaceAssembly` for spaces).
 */

import { useAdminLayersStore } from "@/store/admin-layers.store";
import { useTranslation } from "@/i18n";
import type { ElementType } from "@/core/estimation/elementTypes";

interface Props {
  /** Restricts the offered presets to this element type. */
  elementType: ElementType;
  /** Currently selected preset id (undefined ⇒ "None"). */
  value: string | undefined;
  /** Fires with the chosen preset id, or undefined when "None" is picked. */
  onChange: (assemblyId: string | undefined) => void;
  /** Localized field label (e.g. "Cost assembly", "Floor assembly"). */
  label: string;
}

const AssemblyPicker = ({ elementType, value, onChange, label }: Props) => {
  const { t } = useTranslation();
  const presets = useAdminLayersStore((s) => s.presets);
  const scoped = presets.filter((p) => p.elementType === elementType);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        aria-label={label}
        className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
      >
        <option value="">{t("wall.noAssembly")}</option>
        {scoped.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name || t("admin.newPreset")}
          </option>
        ))}
      </select>
    </div>
  );
};

export default AssemblyPicker;
