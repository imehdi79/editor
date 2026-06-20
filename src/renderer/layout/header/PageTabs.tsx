/**
 * PageTabs — horizontal, touch-scrollable page switcher for the current
 * project. Tap a tab to open it; the active tab carries a delete affordance
 * (when more than one page exists); the trailing + adds a blank page.
 */

import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProjectsStore } from "@/store/projects.store";
import { useTranslation } from "@/i18n";

const PageTabs = () => {
  const { t } = useTranslation();
  const project = useProjectsStore((s) => s.projects[s.currentProjectId]);
  const openPage = useProjectsStore((s) => s.openPage);
  const addPage = useProjectsStore((s) => s.addPage);
  const deletePage = useProjectsStore((s) => s.deletePage);

  if (!project) return null;
  const multi = project.pages.length > 1;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
      {project.pages.map((page) => {
        const active = page.id === project.activePageId;
        return (
          <div
            key={page.id}
            className={cn(
              "flex shrink-0 items-center rounded-md text-xs",
              active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <button
              onClick={() => openPage(page.id)}
              className="max-w-[28vw] truncate px-2.5 py-1.5 font-medium"
              title={page.name}
            >
              {page.name}
            </button>
            {active && multi && (
              <button
                onClick={() => deletePage(page.id)}
                title={t("pages.delete")}
                className="shrink-0 pr-1.5 opacity-80 hover:opacity-100"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
      <Button size="icon-sm" variant="ghost" className="shrink-0" title={t("pages.add")} onClick={() => addPage()}>
        <Plus size={14} />
      </Button>
    </div>
  );
};

export default PageTabs;
