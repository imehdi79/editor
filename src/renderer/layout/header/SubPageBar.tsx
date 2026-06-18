/**
 * SubPageBar — the sub-pages section shown directly below the header for the
 * active page. Lists the page's sub-pages (renamed inline), with a quick-add
 * button for a blank sub-page and a template button that opens the picker.
 *
 * Sub-pages are page metadata, not a live document, so all mutations go through
 * projects.store without touching the canvas (no reload on create/rename).
 */

import { useState } from "react";
import { Plus, LayoutTemplate, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectsStore } from "@/store/projects.store";
import type { SubPage } from "@/store/projects.store";
import SubPageTemplateModal from "./SubPageTemplateModal";

const SubPageTab = ({ subPage }: { subPage: SubPage }) => {
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
    <div className="flex shrink-0 items-center rounded-md bg-muted text-xs text-muted-foreground hover:text-foreground">
      <button onClick={begin} className="max-w-[28vw] truncate px-2.5 py-1 font-medium" title="Rename sub-page">
        {subPage.name}
      </button>
      <button
        onClick={() => deleteSubPage(subPage.id)}
        title="Delete sub-page"
        className="shrink-0 pr-1.5 opacity-70 hover:opacity-100"
      >
        <X size={11} />
      </button>
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
  const subPages = page.subPages ?? [];

  return (
    <div className="fixed inset-x-0 top-12 z-40 flex h-9 items-center gap-1.5 border-b bg-popover/95 px-2 backdrop-blur-sm">
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sub-pages</span>

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {subPages.length === 0 ? (
          <span className="truncate text-[11px] text-muted-foreground/70">None yet</span>
        ) : (
          subPages.map((sp) => <SubPageTab key={sp.id} subPage={sp} />)
        )}
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
