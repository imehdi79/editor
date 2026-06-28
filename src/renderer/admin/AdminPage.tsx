/**
 * AdminPage — the standalone admin route (/admin).
 *
 * A two-pane page: a sidebar of admin sections and a content area for the
 * active one. Sections live in NAV_ITEMS so adding a new one is a single entry
 * (id + icon + i18n key) plus a branch in AdminContent — no layout changes.
 * Access is gated to admin roles by App; the back button returns to the editor.
 */

import { useState } from "react";
import { ArrowLeft, DollarSign, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouterStore } from "@/store/router.store";
import { useTranslation, type TranslationKey } from "@/i18n";

type AdminSection = "pricing";

const NAV_ITEMS: { id: AdminSection; icon: LucideIcon; key: TranslationKey }[] = [
  { id: "pricing", icon: DollarSign, key: "admin.pricing" },
];

const AdminContent = ({ section }: { section: AdminSection }) => {
  const { t } = useTranslation();
  switch (section) {
    case "pricing":
      return <p className="text-sm text-muted-foreground">{t("admin.pricingContent")}</p>;
  }
};

const AdminPage = () => {
  const { t } = useTranslation();
  const navigate = useRouterStore((s) => s.navigate);
  const [section, setSection] = useState<AdminSection>("pricing");

  return (
    <div className="flex h-svh w-svw flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-popover/95 px-2 backdrop-blur-sm">
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => navigate("editor")}>
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">{t("admin.backToEditor")}</span>
        </Button>
        <div className="h-5 w-px shrink-0 bg-border" />
        <span className="text-sm font-medium">{t("admin.title")}</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-44 shrink-0 flex-col gap-1 border-r p-2">
          {NAV_ITEMS.map(({ id, icon: Icon, key }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                section === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
