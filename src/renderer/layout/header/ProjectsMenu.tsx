/**
 * ProjectsMenu — the "Projects" dropdown in the header.
 *
 * New project + a recents list that doubles as Load (no backend yet, so the
 * list is the in-memory projects ordered most-recently-opened first).
 */

import { useState, useRef, useEffect } from "react";
import { FolderOpen, ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectsStore } from "@/store/projects.store";
import type { ProjectSummary } from "@/store/project.types";
import { formatRelativeTime } from "@/lib/relativeTime";

const ProjectsMenu = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const projects = useProjectsStore((s) => s.projects);
  const recentIds = useProjectsStore((s) => s.recentIds);
  const recentSummaries = useProjectsStore((s) => s.recentSummaries);
  const currentId = useProjectsStore((s) => s.currentProjectId);
  const createProject = useProjectsStore((s) => s.createProject);
  const loadProject = useProjectsStore((s) => s.loadProject);
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const refreshRecents = useProjectsStore((s) => s.refreshRecents);

  useEffect(() => {
    if (!open) return;
    refreshRecents();
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, refreshRecents]);

  // Local working set first (immediate), then persisted-only projects not yet
  // loaded into memory. Deduped by id, local taking precedence.
  const localList: ProjectSummary[] = recentIds
    .map((id) => projects[id])
    .filter(Boolean)
    .map((p) => ({ id: p.id, name: p.name, pageCount: p.pages.length, updatedAt: p.updatedAt }));
  const localIds = new Set(localList.map((p) => p.id));
  const list: ProjectSummary[] = [...localList, ...recentSummaries.filter((s) => !localIds.has(s.id))];
  const canDelete = Object.keys(projects).length > 1;

  return (
    <div ref={ref} className="relative shrink-0">
      <Button
        size="sm"
        variant={open ? "default" : "outline"}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <FolderOpen size={15} />
        <span className="hidden sm:inline">Projects</span>
        <ChevronDown size={14} />
      </Button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border bg-popover p-1.5 shadow-2xl">
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              createProject();
              setOpen(false);
            }}
          >
            <Plus size={15} /> New project
          </Button>

          <div className="my-1 border-t" />
          <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Recent
          </div>

          <div className="max-h-64 overflow-auto">
            {list.map((p) => (
              <div key={p.id} className="group flex items-center rounded-md hover:bg-muted">
                <button
                  onClick={() => {
                    loadProject(p.id);
                    setOpen(false);
                  }}
                  className="flex min-w-0 flex-1 flex-col items-start px-2 py-1.5 text-left"
                >
                  <span className="w-full truncate text-xs font-medium">
                    {p.name}
                    {p.id === currentId && <span className="text-muted-foreground"> · current</span>}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {p.pageCount} page{p.pageCount > 1 ? "s" : ""} · {formatRelativeTime(p.updatedAt)}
                  </span>
                </button>
                {canDelete && (
                  <button
                    onClick={() => deleteProject(p.id)}
                    title="Delete project"
                    className="shrink-0 px-2 py-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsMenu;
