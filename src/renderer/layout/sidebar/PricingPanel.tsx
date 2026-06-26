/**
 * PricingPanel — a modal to define the project's pricing rules (the "latest
 * rates"). Same centered-modal pattern as SettingsPanel. Backed by pricing.store:
 *   - currency label + demolition rate (per m² of an existing wall);
 *   - one billing rule per material (and the structural core): a unit
 *     (m² / linear m / piece / m³) and a rate; per-piece rules add a pieces-per
 *     factor and the basis (area/volume) the count is measured against.
 *   - a toggle for the on-canvas pricing table.
 *
 * Rule keys/units stay framework-free in pricing.store / core; this panel only
 * maps them to localized labels.
 */

import { useState } from "react";
import { Coins, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/number-field";
import { usePricingStore } from "@/store/pricing.store";
import { WALL_MATERIALS, materialColor } from "@/core/wall-layers/wallLayers";
import { CORE_RATE_KEY, PRICING_UNITS, type PieceBasis, type PricingUnit } from "@/core/pricing/pricingRates";
import { useTranslation, type TranslationKey } from "@/i18n";

const CORE_DOT = "#1e293b"; // structural-core marker (matches the wall body fill)

const rateInputCls =
  "h-7 w-24 rounded-md border bg-background px-2 text-right text-xs outline-none focus-visible:border-ring";
const selectCls =
  "h-7 rounded-md border bg-background px-1.5 text-xs outline-none focus-visible:border-ring";

interface PricingPanelProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

const PricingPanel = ({ open: openProp, onOpenChange, hideTrigger }: PricingPanelProps) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const { t, tf } = useTranslation();

  const currency = usePricingStore((s) => s.currency);
  const setCurrency = usePricingStore((s) => s.setCurrency);
  const rates = usePricingStore((s) => s.rates);
  const setRate = usePricingStore((s) => s.setRate);
  const demolishRate = usePricingStore((s) => s.demolishRate);
  const setDemolishRate = usePricingStore((s) => s.setDemolishRate);
  const showPricingTable = usePricingStore((s) => s.showPricingTable);
  const setShowPricingTable = usePricingStore((s) => s.setShowPricingTable);

  // Rule rows: the structural core first, then each catalog material.
  const rows: { key: string; label: string; color: string }[] = [
    { key: CORE_RATE_KEY, label: t("pricing.core"), color: CORE_DOT },
    ...WALL_MATERIALS.map((m) => ({
      key: m.name,
      label: tf(`materials.${m.name.toLowerCase()}`, m.name),
      color: materialColor(m.name),
    })),
  ];

  const unitLabel = (u: PricingUnit) => t(`pricingUnit.${u}` as TranslationKey);
  const basisLabel = (b: PieceBasis) => t(`pricingBasis.${b}` as TranslationKey);

  return (
    <>
      {!hideTrigger && (
        <Button
          size="icon"
          variant={open ? "default" : "ghost"}
          title={t("pricing.title")}
          onClick={() => setOpen(!open)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <Coins size={16} />
        </Button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 supports-backdrop-filter:backdrop-blur-xs"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-[min(94vw,24rem)] flex-col gap-3 overflow-y-auto rounded-xl border bg-popover p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("pricing.title")}</span>
              <Button size="icon-xs" variant="ghost" title={t("common.close")} onClick={() => setOpen(false)}>
                <X size={14} />
              </Button>
            </div>

            {/* Currency label (free text) */}
            <label className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{t("pricing.currency")}</span>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-7 w-24 rounded-md border bg-background px-2 text-right text-xs outline-none focus-visible:border-ring"
              />
            </label>

            {/* Demolition rate (per m² of existing wall) */}
            <label className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{t("pricing.demolitionRate")}</span>
              <span className="flex items-center gap-1">
                <NumericInput value={demolishRate} min={0} onChange={setDemolishRate} className={rateInputCls} />
                <span className="text-muted-foreground">/m²</span>
              </span>
            </label>

            {/* On-canvas pricing table toggle */}
            <label className="flex items-center justify-between gap-2 border-t pt-2 text-xs">
              <span className="text-muted-foreground">{t("pricing.showTable")}</span>
              <button
                type="button"
                role="switch"
                aria-checked={showPricingTable}
                onClick={() => setShowPricingTable(!showPricingTable)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  showPricingTable ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-4 rounded-full bg-background transition-all ${
                    showPricingTable ? "left-4" : "left-0.5"
                  }`}
                />
              </button>
            </label>

            {/* Material billing rules */}
            <div className="flex flex-col gap-2 border-t pt-2">
              <span className="text-xs font-medium text-muted-foreground">{t("pricing.materialRules")}</span>
              {rows.map((row) => {
                const rate = rates[row.key];
                const unit = rate?.unit ?? "area";
                return (
                  <div key={row.key} className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 shrink-0 rounded-sm border border-black/10"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="text-xs font-medium">{row.label}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <select
                        value={unit}
                        onChange={(e) => setRate(row.key, { unit: e.target.value as PricingUnit })}
                        className={selectCls}
                      >
                        {PRICING_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {unitLabel(u)}
                          </option>
                        ))}
                      </select>
                      <span className="flex items-center gap-1">
                        <NumericInput
                          value={rate?.rate ?? 0}
                          min={0}
                          onChange={(v) => setRate(row.key, { rate: v })}
                          className={rateInputCls}
                        />
                        <span className="w-10 truncate text-muted-foreground">{currency}</span>
                      </span>
                    </div>

                    {/* Per-piece rules need a pieces-per factor + its basis. */}
                    {unit === "piece" && (
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="text-muted-foreground">{t("pricing.piecesPer")}</span>
                          <NumericInput
                            value={rate?.piecesPerUnit ?? 0}
                            min={0}
                            onChange={(v) => setRate(row.key, { piecesPerUnit: v })}
                            className="h-7 w-16 rounded-md border bg-background px-2 text-right text-xs outline-none focus-visible:border-ring"
                          />
                        </span>
                        <select
                          value={rate?.pieceBasis ?? "area"}
                          onChange={(e) => setRate(row.key, { pieceBasis: e.target.value as PieceBasis })}
                          className={selectCls}
                        >
                          {(["area", "volume"] as const).map((b) => (
                            <option key={b} value={b}>
                              {basisLabel(b)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PricingPanel;
