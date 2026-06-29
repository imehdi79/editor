/**
 * AdminPage — the standalone admin route (/admin).
 *
 * A two-pane CAD console: a labeled sidebar of admin sections and a content
 * panel for the active one. Sections live in NAV_ITEMS so adding one is a single
 * entry (id + icon + i18n key) plus a branch in AdminContent. Access is gated to
 * admin roles by App; the back button returns to the editor.
 */

import { useState } from "react";
import { ArrowLeft, DollarSign, BadgeCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/BrandMark";
import { useRouterStore } from "@/store/router.store";
import { useAuthStore } from "@/store/auth.store";
import type { UserRole } from "@/api/authApi";
import { useTranslation, type TranslationKey } from "@/i18n";

type AdminSection = "pricing";

const NAV_ITEMS: { id: AdminSection; icon: LucideIcon; key: TranslationKey }[] = [
  { id: "pricing", icon: DollarSign, key: "admin.pricing" },
];

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
