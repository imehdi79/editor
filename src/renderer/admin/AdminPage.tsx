/**
 * AdminPage — the standalone admin route (/admin).
 *
 * A two-pane CAD console: a labeled sidebar of admin sections and a content
 * panel for the active one. Sections live in NAV_ITEMS so adding one is a single
 * entry (id + icon + i18n key) plus a branch in AdminContent. Access is gated to
 * admin roles by App; the back button returns to the editor.
 */

import { useState } from "react";
import { ArrowLeft, DollarSign, BadgeCheck, Palette, Layers3, Boxes, Plus, Trash2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/BrandMark";
import { NumericInput } from "@/components/ui/number-field";
import { Button } from "@/components/ui/button";
import { useRouterStore } from "@/store/router.store";
import { useAuthStore } from "@/store/auth.store";
import { useAdminLayersStore, type AdminWallLayer } from "@/store/admin-layers.store";
import { materialColor } from "@/core/wall-layers/wallLayers";
import type { UserRole } from "@/api/authApi";
import { useTranslation, type TranslationKey } from "@/i18n";

type AdminSection = "pricing" | "materials" | "layers" | "presets";

const NAV_ITEMS: { id: AdminSection; icon: LucideIcon; key: TranslationKey }[] = [
  { id: "pricing", icon: DollarSign, key: "admin.pricing" },
  { id: "materials", icon: Palette, key: "admin.materials" },
  { id: "layers", icon: Layers3, key: "admin.layers" },
  { id: "presets", icon: Boxes, key: "admin.presets" },
];

const FIELD = "h-8 rounded-md bg-panel-2 px-2 text-sm text-ink outline-none hair focus-visible:ring-1 focus-visible:ring-brand";
/** Layer / detail row: name, material, thickness, remove. */
const ROW = "grid grid-cols-[1fr_9rem_7rem_2.25rem] items-center gap-2";
/** Materials row: name, colour, thickness, remove. */
const MATERIAL_ROW = "grid grid-cols-[1fr_3.5rem_7rem_2.25rem] items-center gap-2 px-3";

/** Material picker — options come from the admin materials palette; an unknown
 *  /legacy material stays selectable (WallLayersPanel pattern). */
const MaterialSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const { tf } = useTranslation();
  const materials = useAdminLayersStore((s) => s.materials);
  const label = (name: string) => tf(`materials.${name.toLowerCase()}`, name);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={FIELD}>
      {!materials.some((m) => m.name === value) && <option value={value}>{label(value)}</option>}
      {materials.map((m) => (
        <option key={m.id} value={m.name}>
          {label(m.name)}
        </option>
      ))}
    </select>
  );
};

/** Right-aligned thickness field with a trailing "cm" unit. */
const ThicknessField = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex items-center justify-end gap-1">
    <NumericInput value={value} min={0.1} onChange={onChange} className={cn(FIELD, "w-14 text-right")} />
    <span className="w-5 text-xs text-ink-3">cm</span>
  </div>
);

const RemoveButton = ({ title, onClick, className }: { title: string; onClick: () => void; className?: string }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    className={cn(
      "grid size-8 place-items-center rounded-md text-ink-3 transition-colors hover:bg-panel-2 hover:text-danger",
      className,
    )}
  >
    <Trash2 className="size-4" />
  </button>
);

/** Colour chip — resolved from the materials palette by name, or an explicit
 *  `color` override (used by the materials list itself). */
const Swatch = ({ material, color }: { material?: string; color?: string }) => {
  const materials = useAdminLayersStore((s) => s.materials);
  const bg = color ?? materials.find((m) => m.name === material)?.color ?? materialColor(material ?? "");
  return <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: bg }} />;
};

/**
 * AdminMaterialsSection — the base materials palette. Every material option and
 * swatch colour across layers, details and presets resolves from here. Persists
 * to admin-layers.store (localStorage); not yet consumed by the editor.
 */
const AdminMaterialsSection = () => {
  const { t } = useTranslation();
  const materials = useAdminLayersStore((s) => s.materials);
  const addMaterial = useAdminLayersStore((s) => s.addMaterial);
  const updateMaterial = useAdminLayersStore((s) => s.updateMaterial);
  const removeMaterial = useAdminLayersStore((s) => s.removeMaterial);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{t("admin.materials")}</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-2">{t("admin.materialsIntro")}</p>
        </div>
        <Button size="sm" onClick={addMaterial} className="shrink-0">
          <Plus className="size-4" /> {t("admin.addMaterial")}
        </Button>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg bg-panel hair">
        <div className={cn(MATERIAL_ROW, "border-b bg-panel-2 py-2 text-2xs uppercase tracking-wider text-ink-3 mono")}>
          <span>{t("admin.materialName")}</span>
          <span>{t("admin.color")}</span>
          <span className="text-right">{t("admin.thickness")}</span>
          <span />
        </div>

        {materials.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-ink-3">{t("admin.noMaterials")}</p>
        ) : (
          materials.map((m) => (
            <div key={m.id} className={cn(MATERIAL_ROW, "border-b py-2 last:border-b-0")}>
              <div className="flex min-w-0 items-center gap-2">
                <Swatch color={m.color} />
                <input
                  value={m.name}
                  placeholder={t("admin.materialName")}
                  onChange={(e) => updateMaterial(m.id, { name: e.target.value })}
                  className={cn(FIELD, "min-w-0 flex-1")}
                />
              </div>
              <input
                type="color"
                value={m.color}
                onChange={(e) => updateMaterial(m.id, { color: e.target.value })}
                aria-label={t("admin.color")}
                className="h-8 w-full cursor-pointer rounded-md bg-panel-2 p-0.5 hair"
              />
              <ThicknessField value={m.thickness} onChange={(v) => updateMaterial(m.id, { thickness: v })} />
              <RemoveButton
                title={t("admin.removeMaterial")}
                onClick={() => removeMaterial(m.id)}
                className="justify-self-end"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * LayerCard — one catalog layer: its own fields (name, material, thickness) plus
 * the N nested details it's built from. Reads its actions straight from the store.
 */
const LayerCard = ({ layer }: { layer: AdminWallLayer }) => {
  const { t } = useTranslation();
  const updateLayer = useAdminLayersStore((s) => s.updateLayer);
  const removeLayer = useAdminLayersStore((s) => s.removeLayer);
  const addLayerDetail = useAdminLayersStore((s) => s.addLayerDetail);
  const updateLayerDetail = useAdminLayersStore((s) => s.updateLayerDetail);
  const removeLayerDetail = useAdminLayersStore((s) => s.removeLayerDetail);

  return (
    <div className="overflow-hidden rounded-lg bg-panel hair">
      <div className={cn(ROW, "border-b bg-panel-2 px-3 py-2")}>
        <div className="flex min-w-0 items-center gap-2">
          <Swatch material={layer.material} />
          <input
            value={layer.name}
            placeholder={t("admin.layerName")}
            onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
            className={cn(FIELD, "min-w-0 flex-1 bg-panel font-medium")}
          />
        </div>
        <MaterialSelect value={layer.material} onChange={(v) => updateLayer(layer.id, { material: v })} />
        <ThicknessField value={layer.thickness} onChange={(v) => updateLayer(layer.id, { thickness: v })} />
        <RemoveButton title={t("admin.removeLayer")} onClick={() => removeLayer(layer.id)} />
      </div>

      <div className="space-y-2 p-3">
        {layer.details.length === 0 ? (
          <p className="py-2 text-center text-sm text-ink-3">{t("admin.noDetails")}</p>
        ) : (
          layer.details.map((detail) => (
            <div key={detail.id} className={ROW}>
              <div className="flex min-w-0 items-center gap-2">
                <Swatch material={detail.material} />
                <input
                  value={detail.name}
                  placeholder={t("admin.detailName")}
                  onChange={(e) => updateLayerDetail(layer.id, detail.id, { name: e.target.value })}
                  className={cn(FIELD, "min-w-0 flex-1")}
                />
              </div>
              <MaterialSelect
                value={detail.material}
                onChange={(v) => updateLayerDetail(layer.id, detail.id, { material: v })}
              />
              <ThicknessField
                value={detail.thickness}
                onChange={(v) => updateLayerDetail(layer.id, detail.id, { thickness: v })}
              />
              <RemoveButton
                title={t("admin.removeDetail")}
                onClick={() => removeLayerDetail(layer.id, detail.id)}
                className="justify-self-end"
              />
            </div>
          ))
        )}

        <Button size="sm" variant="ghost" onClick={() => addLayerDetail(layer.id)} className="mt-1 h-7 text-ink-2">
          <Plus className="size-4" /> {t("admin.addDetail")}
        </Button>
      </div>
    </div>
  );
};

/**
 * AdminLayersSection — the wall-layer catalog. Each layer is a card carrying its
 * own fields plus the nested details it's built from. Persists to
 * admin-layers.store (localStorage); not yet consumed by the editor.
 */
const AdminLayersSection = () => {
  const { t } = useTranslation();
  const layers = useAdminLayersStore((s) => s.layers);
  const addLayer = useAdminLayersStore((s) => s.addLayer);

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

      {layers.length === 0 ? (
        <p className="mt-5 rounded-lg bg-panel px-3 py-10 text-center text-sm text-ink-3 hair">{t("admin.noLayers")}</p>
      ) : (
        <div className="mt-5 space-y-4">
          {layers.map((layer) => (
            <LayerCard key={layer.id} layer={layer} />
          ))}
        </div>
      )}
    </div>
  );
};

/** Column template for a preset's layer rows (swatch+material, thickness, remove). */
const PRESET_ROW = "grid grid-cols-[1fr_7rem_2.25rem] items-center gap-2";

/**
 * AdminPresetsSection — compose named wall assemblies (presets) from layers and
 * review the saved list. Persists to admin-layers.store; not consumed by the
 * editor yet.
 */
const AdminPresetsSection = () => {
  const { t } = useTranslation();
  const presets = useAdminLayersStore((s) => s.presets);
  const addPreset = useAdminLayersStore((s) => s.addPreset);
  const renamePreset = useAdminLayersStore((s) => s.renamePreset);
  const removePreset = useAdminLayersStore((s) => s.removePreset);
  const addPresetLayer = useAdminLayersStore((s) => s.addPresetLayer);
  const updatePresetLayer = useAdminLayersStore((s) => s.updatePresetLayer);
  const removePresetLayer = useAdminLayersStore((s) => s.removePresetLayer);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{t("admin.presets")}</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-2">{t("admin.presetsIntro")}</p>
        </div>
        <Button size="sm" onClick={addPreset} className="shrink-0">
          <Plus className="size-4" /> {t("admin.addPreset")}
        </Button>
      </div>

      {presets.length === 0 ? (
        <p className="mt-5 rounded-lg bg-panel px-3 py-10 text-center text-sm text-ink-3 hair">{t("admin.noPresets")}</p>
      ) : (
        <div className="mt-5 space-y-4">
          {presets.map((preset) => {
            const total = +preset.layers.reduce((s, l) => s + l.thickness, 0).toFixed(2);
            return (
              <div key={preset.id} className="overflow-hidden rounded-lg bg-panel hair">
                <div className="flex items-center gap-2 border-b bg-panel-2 px-3 py-2">
                  <Boxes className="size-4 shrink-0 text-ink-3" />
                  <input
                    value={preset.name}
                    placeholder={t("admin.newPreset")}
                    onChange={(e) => renamePreset(preset.id, e.target.value)}
                    className={cn(FIELD, "min-w-0 flex-1 bg-panel font-medium")}
                  />
                  <span className="shrink-0 text-2xs text-ink-3 mono">
                    {t("admin.total")} {total} cm
                  </span>
                  <RemoveButton title={t("admin.removePreset")} onClick={() => removePreset(preset.id)} />
                </div>

                <div className="space-y-2 p-3">
                  {preset.layers.length === 0 ? (
                    <p className="py-4 text-center text-sm text-ink-3">{t("admin.noLayers")}</p>
                  ) : (
                    preset.layers.map((layer) => (
                      <div key={layer.id} className={PRESET_ROW}>
                        <div className="flex min-w-0 items-center gap-2">
                          <Swatch material={layer.material} />
                          <MaterialSelect
                            value={layer.material}
                            onChange={(v) => updatePresetLayer(preset.id, layer.id, { material: v })}
                          />
                        </div>
                        <ThicknessField
                          value={layer.thickness}
                          onChange={(v) => updatePresetLayer(preset.id, layer.id, { thickness: v })}
                        />
                        <RemoveButton
                          title={t("admin.removeLayer")}
                          onClick={() => removePresetLayer(preset.id, layer.id)}
                          className="justify-self-end"
                        />
                      </div>
                    ))
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => addPresetLayer(preset.id)}
                    className="mt-1 h-7 text-ink-2"
                  >
                    <Plus className="size-4" /> {t("admin.addLayer")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
    case "materials":
      return <AdminMaterialsSection />;
    case "layers":
      return <AdminLayersSection />;
    case "presets":
      return <AdminPresetsSection />;
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
