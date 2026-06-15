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
import type { Page, PageViewport, Project, ProjectSummary } from "./project.types";

export type { Page, PageViewport, Project, ProjectSummary } from "./project.types";

type SaveStatus = "idle" | "saving" | "loading" | "error";

interface ProjectsState {
  projects: Record<string, Project>;
  currentProjectId: string;
  /** Project ids ordered most-recently-opened first (local working set). */
  recentIds: string[];
  /** Project summaries known to the persistence layer (recents / load list). */
  recentSummaries: ProjectSummary[];
  /** Persistence status for save/load feedback in the UI. */
  status: SaveStatus;
  /** Timestamp of the last successful save, for "Saved" feedback. */
  lastSavedAt: number | null;
}

interface ProjectsActions {
  createProject: (name?: string) => void;
  openProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;

  addPage: (name?: string) => void;
  openPage: (pageId: string) => void;
  deletePage: (pageId: string) => void;

  /** Snapshot the live canvas into the current project and persist it. */
  saveCurrentProject: () => Promise<void>;
  /** Load a project by id (from cache if present, else the persistence layer). */
  loadProject: (id: string) => Promise<void>;
  /** Refresh the recents/load list from the persistence layer. */
  refreshRecents: () => Promise<void>;
  /** Reset to a fresh, empty workspace (used on logout / user switch). */
  resetWorkspace: () => void;

  /** Project summaries ordered by recents, for the load menu (local working set). */
  recents: () => ProjectSummary[];
}

export type ProjectsStore = ProjectsState & ProjectsActions;

const DEFAULT_VIEWPORT: PageViewport = { x: 0, y: 0, scale: 1 };

const emptyPage = (name: string): Page => ({
  id: uid(),
  name,
  shapes: {},
  viewport: { ...DEFAULT_VIEWPORT },
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
  recentSummaries: [],
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

  deleteProject: (id) => {
    const { projects, currentProjectId } = get();
    if (!projects[id] || Object.keys(projects).length <= 1) return; // keep at least one
    console.log("[projects] delete", id);
    const { [id]: _removed, ...rest } = projects;
    const recentIds = get().recentIds.filter((rid) => rid !== id);
    set({ projects: rest, recentIds });
    if (currentProjectId === id) {
      const nextId = recentIds[0] ?? Object.keys(rest)[0];
      get().openProject(nextId);
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

  saveCurrentProject: async () => {
    set({ status: "saving" });
    // Fold the live canvas into the current project before persisting.
    const project = snapshotIntoCurrent(get());
    set((s) => ({ projects: { ...s.projects, [project.id]: project } }));
    try {
      await projectsApi.save(project);
      console.log("[projects] saved", project.id, project.name);
      set({ status: "idle", lastSavedAt: Date.now() });
      await get().refreshRecents();
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

  refreshRecents: async () => {
    try {
      const summaries = await projectsApi.recent(10);
      set({ recentSummaries: summaries });
    } catch (err) {
      console.error("[projects] refresh recents failed", err);
    }
  },

  resetWorkspace: () => {
    const project = newProject("Untitled project");
    set({
      projects: { [project.id]: project },
      currentProjectId: project.id,
      recentIds: [project.id],
      recentSummaries: [],
      status: "idle",
      lastSavedAt: null,
    });
    loadLive(project.pages[0]);
  },

  recents: () => {
    const { projects, recentIds } = get();
    return recentIds
      .map((id) => projects[id])
      .filter((p): p is Project => Boolean(p))
      .map((p) => ({ id: p.id, name: p.name, pageCount: p.pages.length, updatedAt: p.updatedAt }));
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
