/**
 * Header — mobile-first top bar: Projects menu (New / Load / Recents), an
 * inline-editable project name, and the page switcher.
 *
 * Sits as fixed app chrome above the canvas; the floating sidebar is offset
 * below it. Document state lives in projects.store / floor-plan.store.
 */

import { useState } from "react";
import { Check, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectsStore } from "@/store/projects.store";
import ProjectsMenu from "./ProjectsMenu";
import PageTabs from "./PageTabs";
import AccountMenu from "./AccountMenu";

const SaveButton = () => {
  const status = useProjectsStore((s) => s.status);
  const lastSavedAt = useProjectsStore((s) => s.lastSavedAt);
  const saveCurrentProject = useProjectsStore((s) => s.saveCurrentProject);

  const saving = status === "saving";
  // "Saved" badge for a short window after a successful save.
  const justSaved = lastSavedAt !== null && Date.now() - lastSavedAt < 2500;

  return (
    <Button
      size="sm"
      variant="outline"
      className="shrink-0"
      disabled={saving}
      onClick={() => saveCurrentProject()}
      title="Save project"
    >
      {saving ? (
        <Loader2 size={14} className="animate-spin" />
      ) : justSaved ? (
        <Check size={14} className="text-emerald-500" />
      ) : (
        <Save size={14} />
      )}
      <span className="hidden sm:inline">{saving ? "Saving…" : justSaved ? "Saved" : "Save"}</span>
    </Button>
  );
};

const EditableName = () => {
  const currentId = useProjectsStore((s) => s.currentProjectId);
  const name = useProjectsStore((s) => s.projects[s.currentProjectId]?.name ?? "");
  const renameProject = useProjectsStore((s) => s.renameProject);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const begin = () => {
    setDraft(name);
    setEditing(true);
  };
  const commit = () => {
    if (draft.trim()) renameProject(currentId, draft);
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
        className="h-7 w-32 max-w-[34vw] rounded-md border bg-background px-2 text-xs font-medium outline-none focus-visible:border-ring sm:w-40"
      />
    );
  }

  return (
    <button
      onClick={begin}
      title="Rename project"
      className="max-w-[34vw] shrink truncate rounded-md px-2 py-1 text-xs font-medium hover:bg-muted sm:max-w-48"
    >
      {name}
    </button>
  );
};

const Header = () => {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-12 items-center gap-2 border-b bg-popover/95 px-2 backdrop-blur-sm">
      <ProjectsMenu />
      <EditableName />
      <SaveButton />
      <div className="h-5 w-px shrink-0 bg-border" />
      <PageTabs />
      <div className="h-5 w-px shrink-0 bg-border" />
      <AccountMenu />
    </header>
  );
};

export default Header;
