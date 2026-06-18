/**
 * projects.store — the project → pages document tree.
 *
 * The canvas keeps a single *live* document (floor-plan.store.shapes +
 * viewport.store). This store owns the tree of projects, each with one or more
 * pages; every page carries its own shapes + viewport snapshot.
 *
 * Switching page/project follows one rule:
 *   1. snapshot the live stores into the outgoing page
 *   2. load the target page into the live stores
 *   3. reset undo history + selection (each page is its own undo timeline)
 *
 * No persistence yet: everything lives in memory and actions are console.logged.
 * When a backend lands, this store becomes the cache — load/save turn async and
 * persist Page.shapes; the live-mirror pattern stays the same.
 */

import { create } from "zustand";
import { useFloorPlanStore } from "./floor-plan.store";
import { useViewportStore } from "./viewport.store";
import { useSelectionStore } from "./selection.store";
import { uid } from "@/lib/uid";
import { projectsApi } from "@/services/projectsApi";
import { invalidateProjects } from "@/api/queryClient";
import type { Page, PageViewport, Project, SubPage } from "./project.types";
import type { SubPageTemplate } from "@/core/sub-page/templates";

export type { Page, PageViewport, Project, ProjectSummary, SubPage } from "./project.types";

type SaveStatus = "idle" | "saving" | "loading" | "error";

interface ProjectsState {
  projects: Record<string, Project>;
  currentProjectId: string;
  /** Project ids ordered most-recently-opened first (local working set). */
  recentIds: string[];
  /** Persistence status for save/load feedback in the UI. */
  status: SaveStatus;
  /** Timestamp of the last successful save, for "Saved" feedback. */
  lastSavedAt: number | null;
}

interface ProjectsActions {
  createProject: (name?: string) => void;
  openProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  /** Delete a project on the backend + drop it from the local working set. */
  deleteProject: (id: string) => Promise<void>;

  addPage: (name?: string) => void;
  openPage: (pageId: string) => void;
  deletePage: (pageId: string) => void;

  /** Add a sub-page to the active page — blank, or seeded from a template. */
  addSubPage: (template?: SubPageTemplate) => void;
  renameSubPage: (subPageId: string, name: string) => void;
  deleteSubPage: (subPageId: string) => void;

  /** Snapshot the live canvas into the current project and persist it. */
  saveCurrentProject: () => Promise<void>;
  /** Load a project by id (from cache if present, else the persistence layer). */
  loadProject: (id: string) => Promise<void>;
  /** Reset to a fresh, empty workspace (used on logout / user switch). */
  resetWorkspace: () => void;
}

export type ProjectsStore = ProjectsState & ProjectsActions;

const DEFAULT_VIEWPORT: PageViewport = { x: 0, y: 0, scale: 1 };

const emptyPage = (name: string): Page => ({
  id: uid(),
  name,
  shapes: {},
  viewport: { ...DEFAULT_VIEWPORT },
  subPages: [],
});

const newProject = (name: string): Project => {
  const page = emptyPage("Page 1");
  const now = Date.now();
  return { id: uid(), name, pages: [page], activePageId: page.id, createdAt: now, updatedAt: now };
};

// ---------------------------------------------------------------------------
// Live-document mirror: read/write the canvas stores
// ---------------------------------------------------------------------------

/** Read the live canvas state into a page snapshot. */
const snapshotLive = (): Pick<Page, "shapes" | "viewport"> => {
  const { shapes } = useFloorPlanStore.getState();
  const { x, y, scale } = useViewportStore.getState();
  return { shapes: { ...shapes }, viewport: { x, y, scale } };
};

/** Push a page's document into the live canvas stores + reset undo/selection. */
const loadLive = (page: Page): void => {
  useFloorPlanStore.getState().loadShapes({ ...page.shapes });
  useFloorPlanStore.temporal.getState().clear();
  useViewportStore.getState().setViewport(page.viewport.x, page.viewport.y, page.viewport.scale);
  useSelectionStore.getState().clearSelection();
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const bootstrap = newProject("Untitled project");

export const useProjectsStore = create<ProjectsStore>((set, get) => ({
  projects: { [bootstrap.id]: bootstrap },
  currentProjectId: bootstrap.id,
  recentIds: [bootstrap.id],
  status: "idle",
  lastSavedAt: null,

  createProject: (name) => {
    const project = newProject(name?.trim() || "Untitled project");
    console.log("[projects] create", project.id, project.name);
    // Snapshot the outgoing project, then add + switch to the fresh blank page.
    set((s) => ({
      projects: {
        ...s.projects,
        [s.currentProjectId]: snapshotIntoCurrent(s),
        [project.id]: project,
      },
      currentProjectId: project.id,
      recentIds: [project.id, ...s.recentIds.filter((id) => id !== project.id)],
    }));
    loadLive(project.pages[0]);
  },

  openProject: (id) => {
    const target = get().projects[id];
    if (!target) return;
    console.log("[projects] open", id, target.name);
    set((s) => ({ projects: { ...s.projects, [s.currentProjectId]: snapshotIntoCurrent(s) } }));
    set((s) => ({
      currentProjectId: id,
      recentIds: [id, ...s.recentIds.filter((rid) => rid !== id)],
    }));
    const project = get().projects[id];
    const active = project.pages.find((p) => p.id === project.activePageId) ?? project.pages[0];
    loadLive(active);
  },

  renameProject: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    console.log("[projects] rename", id, trimmed);
    set((s) => {
      const p = s.projects[id];
      if (!p) return s;
      return { projects: { ...s.projects, [id]: { ...p, name: trimmed, updatedAt: Date.now() } } };
    });
  },

  deleteProject: async (id) => {
    console.log("[projects] delete", id);
    try {
      await projectsApi.remove(id);
    } catch (err) {
      console.error("[projects] delete failed", err);
      return;
    }
    invalidateProjects(); // refresh the cached recents/all lists

    // Local working-set cleanup (the project may not be loaded locally).
    const { projects, currentProjectId } = get();
    if (!projects[id]) return;
    const { [id]: _removed, ...rest } = projects;
    const recentIds = get().recentIds.filter((rid) => rid !== id);
    set({ projects: rest, recentIds });
    if (currentProjectId === id) {
      const nextId = recentIds.find((rid) => rest[rid]) ?? Object.keys(rest)[0];
      if (nextId) get().openProject(nextId);
      else get().resetWorkspace();
    }
  },

  addPage: (name) => {
    const { currentProjectId } = get();
    const project = get().projects[currentProjectId];
    const page = emptyPage(name?.trim() || `Page ${project.pages.length + 1}`);
    console.log("[projects] add page", page.id, page.name);
    set((s) => {
      // snapshotIntoCurrent folds the current page's live drawing into
      // snapped.pages — append onto THAT, not the stale pre-snapshot array.
      const snapped = snapshotIntoCurrent(s);
      return {
        projects: {
          ...s.projects,
          [currentProjectId]: {
            ...snapped,
            pages: [...snapped.pages, page],
            activePageId: page.id,
            updatedAt: Date.now(),
          },
        },
      };
    });
    loadLive(page);
  },

  openPage: (pageId) => {
    const { currentProjectId } = get();
    const project = get().projects[currentProjectId];
    if (project.activePageId === pageId) return;
    const target = project.pages.find((p) => p.id === pageId);
    if (!target) return;
    console.log("[projects] open page", pageId, target.name);
    set((s) => {
      const snapped = snapshotIntoCurrent(s);
      return {
        projects: { ...s.projects, [currentProjectId]: { ...snapped, activePageId: pageId } },
      };
    });
    // Re-read the (just-snapshotted) target page so we don't load stale shapes.
    const fresh = get().projects[currentProjectId].pages.find((p) => p.id === pageId)!;
    loadLive(fresh);
  },

  deletePage: (pageId) => {
    const { currentProjectId } = get();
    const project = get().projects[currentProjectId];
    if (project.pages.length <= 1) return; // keep at least one page
    console.log("[projects] delete page", pageId);
    const wasActive = project.activePageId === pageId;
    set((s) => {
      // Snapshot first so the active page's live edits survive when the page
      // being removed is NOT the active one.
      const snapped = snapshotIntoCurrent(s);
      const remaining = snapped.pages.filter((p) => p.id !== pageId);
      return {
        projects: {
          ...s.projects,
          [currentProjectId]: {
            ...snapped,
            pages: remaining,
            activePageId: wasActive ? remaining[0].id : snapped.activePageId,
            updatedAt: Date.now(),
          },
        },
      };
    });
    if (wasActive) loadLive(get().projects[currentProjectId].pages[0]);
  },

  // Sub-pages are metadata on the active page (no live document), so these never
  // touch the canvas mirror — the page object is replaced in place, no reload.
  addSubPage: (template) => {
    const subPage: SubPage = {
      id: uid(),
      name: template?.name ?? "New sub-page",
      template: template?.id,
    };
    console.log("[projects] add sub-page", subPage.id, subPage.name);
    set((s) => patchActivePage(s, (p) => ({ ...p, subPages: [...(p.subPages ?? []), subPage] })));
  },

  renameSubPage: (subPageId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) =>
      patchActivePage(s, (p) => ({
        ...p,
        subPages: (p.subPages ?? []).map((sp) => (sp.id === subPageId ? { ...sp, name: trimmed } : sp)),
      })),
    );
  },

  deleteSubPage: (subPageId) => {
    console.log("[projects] delete sub-page", subPageId);
    set((s) =>
      patchActivePage(s, (p) => ({ ...p, subPages: (p.subPages ?? []).filter((sp) => sp.id !== subPageId) })),
    );
  },

  saveCurrentProject: async () => {
    set({ status: "saving" });
    // Fold the live canvas into the current project before persisting.
    const project = snapshotIntoCurrent(get());
    set((s) => ({ projects: { ...s.projects, [project.id]: project } }));
    try {
      await projectsApi.save(project);
      console.log("[projects] saved", project.id, project.name);
      set({ status: "idle", lastSavedAt: Date.now() });
      invalidateProjects(); // bump it to the top of recents on next read
    } catch (err) {
      console.error("[projects] save failed", err);
      set({ status: "error" });
    }
  },

  loadProject: async (id) => {
    // Already in the working set → just open it.
    if (get().projects[id]) {
      get().openProject(id);
      return;
    }
    set({ status: "loading" });
    try {
      const project = await projectsApi.get(id);
      if (!project) {
        console.warn("[projects] load: not found", id);
        set({ status: "idle" });
        return;
      }
      set((s) => ({ projects: { ...s.projects, [id]: project }, status: "idle" }));
      console.log("[projects] loaded", id, project.name);
      get().openProject(id);
    } catch (err) {
      console.error("[projects] load failed", err);
      set({ status: "error" });
    }
  },

  resetWorkspace: () => {
    const project = newProject("Untitled project");
    set({
      projects: { [project.id]: project },
      currentProjectId: project.id,
      recentIds: [project.id],
      status: "idle",
      lastSavedAt: null,
    });
    loadLive(project.pages[0]);
  },
}));

/**
 * Snapshot the live canvas into the current project's active page and return
 * the updated project (does not mutate; for use inside set()).
 */
function snapshotIntoCurrent(s: ProjectsState): Project {
  const project = s.projects[s.currentProjectId];
  const live = snapshotLive();
  const pages = project.pages.map((p) => (p.id === project.activePageId ? { ...p, ...live } : p));
  return { ...project, pages, updatedAt: Date.now() };
}

/**
 * Replace the current project's active page via `fn` and return the partial
 * state for `set()`. For metadata edits that must not disturb the live canvas
 * (the active page's stale `shapes` are intentionally left untouched).
 */
function patchActivePage(s: ProjectsState, fn: (p: Page) => Page): Pick<ProjectsState, "projects"> {
  const project = s.projects[s.currentProjectId];
  if (!project) return { projects: s.projects };
  const pages = project.pages.map((p) => (p.id === project.activePageId ? fn(p) : p));
  return { projects: { ...s.projects, [project.id]: { ...project, pages, updatedAt: Date.now() } } };
}
