/**
 * EstimateResult — the shared costed readout for every estimate surface (the
 * admin sandbox, the admin drawing mode, and the in-editor panel). Renders a
 * per-layer breakdown (grouped by element when more than one is costed), the
 * pre-rules base, the rules that fired, and the rule-adjusted grand total.
 *
 * An item name that is an element-type id is localized; a preset name passes
 * through. Pure presentation — it reads only the materials palette (for a line's
 * fallback label) and never writes.
 */

import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import { useAdminLayersStore } from "@/store/admin-layers.store";
import { ELEMENT_TYPES, type ElementType } from "@/core/estimation/elementTypes";
import type { Estimate } from "@/core/estimation/estimate";
import { ESTIMATE_ROW, money, UNIT_KEY, ELEMENT_TYPE_KEY, RULE_TARGET_KEY } from "./labels";

export const EstimateResult = ({ result }: { result: Estimate }) => {
  const { t, tf } = useTranslation();
  const materials = useAdminLayersStore((s) => s.materials);
  const materialName = (id: string) => {
    const m = materials.find((x) => x.id === id);
    return m ? tf(`materials.${m.name.toLowerCase()}`, m.name) : "—";
  };
  const itemLabel = (name: string) =>
    (ELEMENT_TYPES as readonly string[]).includes(name) ? t(ELEMENT_TYPE_KEY[name as ElementType]) : name;
  const multi = result.items.length > 1;
  const hasLines = result.items.some((i) => i.lines.length > 0);

  return (
    <div className="overflow-hidden rounded-lg bg-panel hair">
      <div className={cn(ESTIMATE_ROW, "border-b bg-panel-2 py-2 text-2xs uppercase tracking-wider text-ink-3 mono")}>
        <span>{t("admin.material")}</span>
        <span>{t("admin.unit")}</span>
        <span className="text-right">{t("admin.quantity")}</span>
        <span className="text-right">{t("admin.materialCost")}</span>
        <span className="text-right">{t("admin.laborCost")}</span>
        <span className="text-right">{t("admin.total")}</span>
      </div>

      {!hasLines ? (
        <p className="px-3 py-6 text-center text-sm text-ink-3">{t("admin.noLayers")}</p>
      ) : (
        result.items.map((item, ii) => (
          <div key={ii}>
            {multi && (
              <div className="flex items-center justify-between border-b bg-panel-2 px-3 py-1.5 text-xs font-medium text-ink-2">
                <span>{itemLabel(item.name)}</span>
                <span className="mono">{money(item.subtotal.total)}</span>
              </div>
            )}
            {item.lines.map((l, li) => (
              <div key={`${ii}-${li}`} className={cn(ESTIMATE_ROW, "border-b py-2 text-sm last:border-b-0")}>
                <span className="truncate">{l.name || materialName(l.materialId)}</span>
                <span className="text-ink-2 mono">{t(UNIT_KEY[l.unit])}</span>
                <span className="text-right mono">{money(l.quantity)}</span>
                <span className="text-right mono">{money(l.cost.material)}</span>
                <span className="text-right mono">{money(l.cost.labor)}</span>
                <span className="text-right mono">{money(l.cost.total)}</span>
              </div>
            ))}
          </div>
        ))
      )}

      <div className={cn(ESTIMATE_ROW, "border-t bg-panel-2 py-2 text-sm")}>
        <span className="text-ink-2">{t("admin.baseTotal")}</span>
        <span />
        <span />
        <span className="text-right mono">{money(result.base.material)}</span>
        <span className="text-right mono">{money(result.base.labor)}</span>
        <span className="text-right mono">{money(result.base.total)}</span>
      </div>

      {result.applied.length > 0 && (
        <div className="bg-panel-2">
          <div className="px-3 pt-1 text-2xs uppercase tracking-wider text-ink-3 mono">{t("admin.adjustments")}</div>
          {result.applied.map((r, i) => (
            <div key={i} className={cn(ESTIMATE_ROW, "py-1 text-xs text-ink-2")}>
              <span className="truncate">
                {r.name || r.flag}{" "}
                <span className="text-ink-3 mono">
                  ({r.effect === "percent" ? `${r.amount}%` : money(r.amount)} · {t(RULE_TARGET_KEY[r.target])})
                </span>
              </span>
              <span />
              <span />
              <span />
              <span />
              <span className="text-right text-brand mono">+{money(r.delta)}</span>
            </div>
          ))}
        </div>
      )}

      <div className={cn(ESTIMATE_ROW, "border-t bg-panel-2 py-2.5 text-sm font-semibold")}>
        <span>{t("admin.grandTotal")}</span>
        <span />
        <span />
        <span className="text-right mono">{money(result.total.material)}</span>
        <span className="text-right mono">{money(result.total.labor)}</span>
        <span className="text-right mono">{money(result.total.total)}</span>
      </div>
    </div>
  );
};
