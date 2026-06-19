/**
 * SubPageBar — the sub-pages section shown directly below the header for the
 * active page. Sub-pages are the page's drawing surfaces: tap one to render it
 * on the canvas (same mirror logic as pages). The active sub-page exposes inline
 * rename and (unless it's the pinned default) delete. A quick-add button adds a
 * blank sub-page copied from the default; the template button opens the picker.
 */

import { useState } from "react";
import { Plus, LayoutTemplate, X, Pencil, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProjectsStore } from "@/store/projects.store";
import type { SubPage } from "@/store/projects.store";
import SubPageTemplateModal from "./SubPageTemplateModal";

const SubPageTab = ({ subPage, active }: { subPage: SubPage; active: boolean }) => {
  const openSubPage = useProjectsStore((s) => s.openSubPage);
  const renameSubPage = useProjectsStore((s) => s.renameSubPage);
  const deleteSubPage = useProjectsStore((s) => s.deleteSubPage);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(subPage.name);

  const begin = () => {
    setDraft(subPage.name);
    setEditing(true);
  };
  const commit = () => {
    if (draft.trim()) renameSubPage(subPage.id, draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") setEditing(false);
        }}
        className="h-6 w-28 shrink-0 rounded-md border bg-background px-2 text-xs font-medium outline-none focus-visible:border-ring"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center rounded-md text-xs",
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      <button
        onClick={() => openSubPage(subPage.id)}
        className="flex max-w-[28vw] items-center gap-1 truncate px-2.5 py-1 font-medium"
        title={subPage.name}
      >
        {subPage.pinned && <Pin size={10} className="shrink-0 opacity-70" />}
        <span className="truncate">{subPage.name}</span>
      </button>
      {active && (
        <>
          <button onClick={begin} title="Rename sub-page" className="shrink-0 pr-1 opacity-80 hover:opacity-100">
            <Pencil size={11} />
          </button>
          {!subPage.pinned && (
            <button
              onClick={() => deleteSubPage(subPage.id)}
              title="Delete sub-page"
              className="shrink-0 pr-1.5 opacity-80 hover:opacity-100"
            >
              <X size={11} />
            </button>
          )}
        </>
      )}
    </div>
  );
};

const SubPageBar = () => {
  const project = useProjectsStore((s) => s.projects[s.currentProjectId]);
  const addSubPage = useProjectsStore((s) => s.addSubPage);
  const [templateOpen, setTemplateOpen] = useState(false);

  if (!project) return null;
  const page = project.pages.find((p) => p.id === project.activePageId);
  if (!page) return null;

  return (
    <div className="fixed inset-x-0 top-12 z-40 flex h-9 items-center gap-1.5 border-b bg-popover/95 px-2 backdrop-blur-sm">
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sub-pages</span>

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {page.subPages.map((sp) => (
          <SubPageTab key={sp.id} subPage={sp} active={sp.id === page.activeSubPageId} />
        ))}
      </div>

      <Button size="icon-sm" variant="ghost" className="shrink-0" title="Add sub-page" onClick={() => addSubPage()}>
        <Plus size={14} />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        className="shrink-0"
        title="New from template"
        onClick={() => setTemplateOpen(true)}
      >
        <LayoutTemplate size={14} />
      </Button>

      <SubPageTemplateModal
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        onSelect={(template) => {
          addSubPage(template);
          setTemplateOpen(false);
        }}
      />
    </div>
  );
};

export default SubPageBar;
