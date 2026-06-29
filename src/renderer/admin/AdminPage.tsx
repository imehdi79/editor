/**
 * AdminPage — the standalone admin route (/admin).
 *
 * A two-pane CAD console: a labeled sidebar of admin sections and a content
 * panel for the active one. Sections live in NAV_ITEMS so adding one is a single
 * entry (id + icon + i18n key) plus a branch in AdminContent. Access is gated to
 * admin roles by App; the back button returns to the editor.
 */

import { useState } from "react";
import { ArrowLeft, DollarSign, BadgeCheck, Layers3, Plus, Trash2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/BrandMark";
import { NumericInput } from "@/components/ui/number-field";
import { Button } from "@/components/ui/button";
import { useRouterStore } from "@/store/router.store";
import { useAuthStore } from "@/store/auth.store";
import { useAdminLayersStore } from "@/store/admin-layers.store";
import { WALL_MATERIALS, materialColor } from "@/core/wall-layers/wallLayers";
import type { UserRole } from "@/api/authApi";
import { useTranslation, type TranslationKey } from "@/i18n";

type AdminSection = "pricing" | "layers";

const NAV_ITEMS: { id: AdminSection; icon: LucideIcon; key: TranslationKey }[] = [
  { id: "pricing", icon: DollarSign, key: "admin.pricing" },
  { id: "layers", icon: Layers3, key: "admin.layers" },
];

const FIELD = "h-8 rounded-md bg-panel-2 px-2 text-sm text-ink outline-none hair focus-visible:ring-1 focus-visible:ring-brand";
const ROW = "grid grid-cols-[1fr_9rem_7rem_2.25rem] items-center gap-2 px-3";

/**
 * AdminLayersSection — curate the reusable wall-layer catalog. Edits persist to
 * admin-layers.store (localStorage). Not yet consumed by the editor.
 */
const AdminLayersSection = () => {
  const { t, tf } = useTranslation();
  const layers = useAdminLayersStore((s) => s.layers);
  const addLayer = useAdminLayersStore((s) => s.addLayer);
  const updateLayer = useAdminLayersStore((s) => s.updateLayer);
  const removeLayer = useAdminLayersStore((s) => s.removeLayer);
  const materialLabel = (name: string) => tf(`materials.${name.toLowerCase()}`, name);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{t("admin.layers")}</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-2">{t("admin.layersIntro")}</p>
        </div>
        <Button size="sm" onClick={addLayer} className="shrink-0">
          <Plus className="size-4" /> {t("admin.addLayer")}
        </Button>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg bg-panel hair">
        <div className={cn(ROW, "border-b bg-panel-2 py-2 text-2xs uppercase tracking-wider text-ink-3 mono")}>
          <span>{t("admin.layerName")}</span>
          <span>{t("admin.material")}</span>
          <span className="text-right">{t("admin.thickness")}</span>
          <span />
        </div>

        {layers.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-ink-3">{t("admin.noLayers")}</p>
        ) : (
          layers.map((layer) => (
            <div key={layer.id} className={cn(ROW, "border-b py-2 last:border-b-0")}>
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: materialColor(layer.material) }}
                />
                <input
                  value={layer.name}
                  onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                  className={cn(FIELD, "min-w-0 flex-1")}
                />
              </div>
              <select
                value={layer.material}
                onChange={(e) => updateLayer(layer.id, { material: e.target.value })}
                className={FIELD}
              >
                {!WALL_MATERIALS.some((m) => m.name === layer.material) && (
                  <option value={layer.material}>{materialLabel(layer.material)}</option>
                )}
                {WALL_MATERIALS.map((m) => (
                  <option key={m.name} value={m.name}>
                    {materialLabel(m.name)}
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-end gap-1">
                <NumericInput
                  value={layer.thickness}
                  min={0.1}
                  onChange={(v) => updateLayer(layer.id, { thickness: v })}
                  className={cn(FIELD, "w-14 text-right")}
                />
                <span className="w-5 text-xs text-ink-3">cm</span>
              </div>
              <button
                type="button"
                title={t("admin.removeLayer")}
                aria-label={t("admin.removeLayer")}
                onClick={() => removeLayer(layer.id)}
                className="grid size-8 place-items-center justify-self-end rounded-md text-ink-3 transition-colors hover:bg-panel-2 hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ROLE_KEY: Record<UserRole, TranslationKey> = {
  user: "roles.user",
  admin: "roles.admin",
  "super-admin": "roles.superAdmin",
};

const AdminContent = ({ section }: { section: AdminSection }) => {
  const { t } = useTranslation();
  switch (section) {
    case "pricing":
      return (
        <div className="max-w-2xl rounded-lg bg-panel p-5 hair">
          <h2 className="text-base font-semibold">{t("admin.pricing")}</h2>
          <p className="mt-2 text-sm text-ink-2">{t("admin.pricingContent")}</p>
        </div>
      );
    case "layers":
      return <AdminLayersSection />;
  }
};

const AdminPage = () => {
  const { t } = useTranslation();
  const navigate = useRouterStore((s) => s.navigate);
  const role = useAuthStore((s) => s.user?.role);
  const [section, setSection] = useState<AdminSection>("pricing");

  return (
    <div className="flex h-svh w-svw flex-col bg-bg text-ink">
      <header className="flex h-12 shrink-0 items-center gap-2 bg-panel px-2 hair">
        <button
          type="button"
          onClick={() => navigate("editor")}
          className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink hair"
        >
          <ArrowLeft size={15} className="flip-x" />
          <span className="hidden sm:inline">{t("admin.backToEditor")}</span>
        </button>
        <div className="mx-1 h-5 w-px shrink-0 bg-line" />
        <div className="grid size-4.5 place-items-center rounded-sm bg-brand text-brand-foreground">
          <BrandMark className="size-3" />
        </div>
        <span className="text-sm font-semibold tracking-tight">{t("admin.title")}</span>
        <div className="flex-1" />
        {role && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-2xs text-brand mono">
            <BadgeCheck size={12} />
            {t(ROLE_KEY[role]).toUpperCase()}
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-48 shrink-0 flex-col gap-1 bg-panel p-2 hair">
          <span className="px-2 py-1.5 text-2xs uppercase tracking-wider text-ink-3 mono">{t("admin.sections")}</span>
          {NAV_ITEMS.map(({ id, icon: Icon, key }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                section === id ? "bg-brand text-brand-foreground" : "text-ink-2 hover:bg-panel-2 hover:text-ink",
              )}
            >
              <Icon size={15} /> {t(key)}
            </button>
          ))}
        </nav>

        <main className="min-h-0 flex-1 overflow-auto p-6">
          <AdminContent section={section} />
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
