/**
 * AssemblyOptions — ranked cost alternatives for one measure (a wall type or a
 * single room surface). Lists the candidate assemblies cheapest-first with each
 * one's all-in total and the delta vs the current pick; clicking switches the
 * selection. Hidden when fewer than two priced choices exist.
 *
 * Pure decision support over the shared {@link recommendAssemblies} engine —
 * reused for walls AND per-room floors/ceilings, so the ranking is identical
 * everywhere.
 */

import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import { recommendAssemblies, type AssemblyOption, type Pricing } from "@/core/estimation/recommend";
import type { ElementMeasure } from "@/core/estimation/estimate";
import { money } from "./labels";

interface Props {
  options: AssemblyOption[];
  measure: ElementMeasure;
  pricing: Pricing;
  /** The currently selected/effective assembly id (delta reference). */
  currentId: string;
  onPick: (id: string) => void;
}

export const AssemblyOptions = ({ options, measure, pricing, currentId, onPick }: Props) => {
  const { t } = useTranslation();
  const recs = recommendAssemblies(options, measure, pricing, currentId || undefined);
  if (recs.length < 2) return null;

  return (
    <div className="space-y-0.5 rounded-md bg-panel-2 p-2">
      <span className="text-2xs uppercase tracking-wider text-ink-3 mono">{t("admin.alternatives")}</span>
      {recs.slice(0, 4).map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onPick(r.id)}
          className={cn(
            "flex w-full items-center gap-2 rounded px-2 py-1 text-xs transition-colors",
            r.current ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-panel",
          )}
        >
          <span className="flex-1 truncate text-start">
            {r.name}
            {r.cheapest && <span className="ml-1.5 text-2xs text-brand">• {t("admin.cheapest")}</span>}
          </span>
          <span className="mono">{money(r.cost.total)}</span>
          {r.delta !== 0 && (
            <span className={cn("w-12 text-end text-2xs mono", r.delta > 0 ? "text-ink-3" : "text-brand")}>
              {r.delta > 0 ? "+" : ""}
              {money(r.delta)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
