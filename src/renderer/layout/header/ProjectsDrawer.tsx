/**
 * ProjectsDrawer — the workspace hub, opened from the header as a bottom sheet.
 *
 * Two categories: Projects (New / Recent / All) and Account (email + logout).
 * The Recent/All lists come from React Query (cached — no refetch on every open);
 * project actions go through projects.store, which invalidates the cache on
 * save/delete so the lists stay fresh.
 */

import { useState, type ReactNode } from "react";
import { FolderOpen, FileStack, UserRound, Plus, Trash2, LogOut, Loader2, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { useProjectsStore } from "@/store/projects.store";
import { useAuthStore } from "@/store/auth.store";
import { useRecentProjects, useAllProjects } from "@/api/useProjectsQueries";
import type { ProjectSummary } from "@/store/project.types";
import { formatRelativeTime } from "@/lib/relativeTime";

type Category = "projects" | "account";
type ProjectTab = "recent" | "all";

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
      className="h-9 shrink-0"
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
      <span>{saving ? "Saving…" : justSaved ? "Saved" : "Save"}</span>
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
        className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm font-medium outline-none focus-visible:border-ring"
      />
    );
  }

  return (
    <button
      onClick={begin}
      title="Rename project"
      className="flex h-9 min-w-0 flex-1 items-center truncate rounded-md border px-3 text-left text-sm font-medium hover:bg-muted"
    >
      {name}
    </button>
  );
};

const Pill = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    {children}
  </button>
);

const ProjectRow = ({
  project,
  isCurrent,
  onOpen,
  onDelete,
}: {
  project: ProjectSummary;
  isCurrent: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) => (
  <div className="group flex items-center rounded-md hover:bg-muted">
    <button onClick={onOpen} className="flex min-w-0 flex-1 flex-col items-start px-3 py-2 text-left">
      <span className="w-full truncate text-sm font-medium">
        {project.name}
        {isCurrent && <span className="text-muted-foreground"> · current</span>}
      </span>
      <span className="text-[11px] text-muted-foreground">
        {project.pageCount} page{project.pageCount > 1 ? "s" : ""} · {formatRelativeTime(project.updatedAt)}
      </span>
    </button>
    <button
      onClick={onDelete}
      title="Delete project"
      className="shrink-0 px-3 py-2 text-muted-foreground hover:text-destructive"
    >
      <Trash2 size={15} />
    </button>
  </div>
);

const ProjectsPanel = ({ onClose }: { onClose: () => void }) => {
  const [tab, setTab] = useState<ProjectTab>("recent");
  const currentId = useProjectsStore((s) => s.currentProjectId);
  const createProject = useProjectsStore((s) => s.createProject);
  const loadProject = useProjectsStore((s) => s.loadProject);
  const deleteProject = useProjectsStore((s) => s.deleteProject);

  // Each query fetches only while its tab is active; cached across opens.
  const recent = useRecentProjects(10, tab === "recent");
  const all = useAllProjects(tab === "all");
  const q = tab === "recent" ? recent : all;
  const items = q.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Current project</div>
        <div className="flex items-center gap-2">
          <EditableName />
          <SaveButton />
        </div>
      </div>

      <div className="h-px bg-border" />

      <Button
        className="w-full"
        onClick={() => {
          createProject();
          onClose();
        }}
      >
        <Plus size={15} /> New project
      </Button>

      <div className="flex gap-1">
        <Pill active={tab === "recent"} onClick={() => setTab("recent")}>
          Recent
        </Pill>
        <Pill active={tab === "all"} onClick={() => setTab("all")}>
          All projects
        </Pill>
      </div>

      <div className="flex flex-col">
        {q.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : q.isError ? (
          <div className="py-6 text-center text-xs text-destructive">
            {(q.error as Error)?.message ?? "Failed to load projects."}
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No saved projects yet — create one and hit Save.
          </div>
        ) : (
          items.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              isCurrent={p.id === currentId}
              onOpen={() => {
                void loadProject(p.id);
                onClose();
              }}
              onDelete={() => void deleteProject(p.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

const AccountPanel = ({ onClose }: { onClose: () => void }) => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Signed in as</div>
        <div className="truncate text-sm font-medium" title={user?.email}>
          {user?.email}
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full justify-start text-destructive hover:text-destructive"
        onClick={() => {
          onClose();
          logout();
        }}
      >
        <LogOut size={15} /> Log out
      </Button>
    </div>
  );
};

const ProjectsDrawer = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("projects");

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="sm" variant="outline" className="shrink-0" title="Workspace">
          <FolderOpen size={15} />
          <span className="hidden sm:inline">Projects</span>
        </Button>
      </DrawerTrigger>

      <DrawerContent className="mx-auto w-full max-w-lg">
        <DrawerHeader className="pb-2">
          <DrawerTitle>Workspace</DrawerTitle>
        </DrawerHeader>

        <div className="flex gap-1 px-4">
          <Pill active={category === "projects"} onClick={() => setCategory("projects")}>
            <FileStack size={14} /> Projects
          </Pill>
          <Pill active={category === "account"} onClick={() => setCategory("account")}>
            <UserRound size={14} /> Account
          </Pill>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4 pt-3">
          {category === "projects" ? (
            <ProjectsPanel onClose={() => setOpen(false)} />
          ) : (
            <AccountPanel onClose={() => setOpen(false)} />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ProjectsDrawer;
