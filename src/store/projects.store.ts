/**
 * projects.store — the project → pages → sub-pages document tree.
 *
 * The canvas keeps a single *live* document (floor-plan.store.shapes +
 * viewport.store). This store owns the tree of projects; each project has one or
 * more pages, and each page has one or more sub-pages. The sub-page is the
 * drawing surface — it carries the shapes + viewport snapshot. Every page has a
 * pinned default sub-page that cannot be removed.
 *
 * Switching page/sub-page/project follows one rule:
 *   1. snapshot the live stores into the outgoing sub-page
 *   2. load the target sub-page into the live stores
 *   3. reset undo history + selection (each sub-page is its own undo timeline)
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

  /**
   * Add a sub-page to the active page and switch the canvas to it. A blank
   * sub-page copies the page's pinned default document; a template sub-page
   * starts empty.
   */
  addSubPage: (template?: SubPageTemplate) => void;
  /** Switch the live canvas to a sub-page of the active page. */
  openSubPage: (subPageId: string) => void;
  renameSubPage: (subPageId: string, name: string) => void;
  /** Remove a sub-page (the pinned default cannot be removed). */
  deleteSubPage: (subPageId: string) => void;

  /** Snapshot the live canvas into the current project and persist it. */
  saveCurrentProject: () => Promise<void>;
  /** Load a project by id (from cache if present, else the persistence layer). */
  loadProject: (id: string) => Promise<void>;
  /** Reset to a fresh, empty workspace (used on logout / user switch). */
  resetWorkspace: () => void;
  /**
   * Replace the working set from a locally-persisted snapshot and load its
   * active document into the live canvas. Used on boot to restore unsaved edits.
   */
  hydrate: (snapshot: WorkspaceSnapshot) => void;
}

export type ProjectsStore = ProjectsState & ProjectsActions;

/** The local working set persisted to / restored from localStorage. */
export interface WorkspaceSnapshot {
  projects: Record<string, Project>;
  currentProjectId: string;
  recentIds: string[];
}

const DEFAULT_VIEWPORT: PageViewport = { x: 0, y: 0, scale: 1 };
const DEFAULT_SUBPAGE_NAME = "Main";

const emptySubPage = (name: string, pinned = false): SubPage => ({
  id: uid(),
  name,
  pinned,
  shapes: {},
  viewport: { ...DEFAULT_VIEWPORT },
});

const emptyPage = (name: string): Page => {
  const sub = emptySubPage(DEFAULT_SUBPAGE_NAME, true);
  return { id: uid(), name, subPages: [sub], activeSubPageId: sub.id };
};

/** The page's active drawing surface (falls back to its first sub-page). */
const activeSubPage = (page: Page): SubPage =>
  page.subPages.find((sp) => sp.id === page.activeSubPageId) ?? page.subPages[0];

const newProject = (name: string): Project => {
  const page = emptyPage("Page 1");
  const now = Date.now();
  return { id: uid(), name, pages: [page], activePageId: page.id, createdAt: now, updatedAt: now };
};

// ---------------------------------------------------------------------------
// Live-document mirror: read/write the canvas stores
// ---------------------------------------------------------------------------

/** Read the live canvas state into a sub-page snapshot. */
const snapshotLive = (): Pick<SubPage, "shapes" | "viewport"> => {
  const { shapes } = useFloorPlanStore.getState();
  const { x, y, scale } = useViewportStore.getState();
  return { shapes: { ...shapes }, viewport: { x, y, scale } };
};

/** Push a sub-page's document into the live canvas stores + reset undo/selection. */
const loadLive = (sub: SubPage): void => {
  useFloorPlanStore.getState().loadShapes({ ...sub.shapes });
  useFloorPlanStore.temporal.getState().clear();
  useViewportStore.getState().setViewport(sub.viewport.x, sub.viewport.y, sub.viewport.scale);
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
    loadLive(activeSubPage(project.pages[0]));
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
    loadLive(activeSubPage(active));
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
    loadLive(activeSubPage(page));
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
    loadLive(activeSubPage(fresh));
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
    if (wasActive) loadLive(activeSubPage(get().projects[currentProjectId].pages[0]));
  },

  // Sub-pages are real drawing surfaces, so add/open/delete follow the same
  // snapshot-then-load dance as pages: fold the live canvas into the current
  // sub-page first, then load the target.
  addSubPage: (template) => {
    const { currentProjectId } = get();
    // Snapshot the live canvas into the current sub-page first, so a blank copy
    // includes the latest edits and we append onto the up-to-date page.
    const snapped = snapshotIntoCurrent(get());
    const page = snapped.pages.find((p) => p.id === snapped.activePageId);
    if (!page) return;
    // Blank sub-pages copy the page's pinned default; template sub-pages start empty.
    const base = page.subPages.find((sp) => sp.pinned) ?? page.subPages[0];
    const created: SubPage = template
      ? { id: uid(), name: template.name, template: template.id, shapes: {}, viewport: { ...DEFAULT_VIEWPORT } }
      : {
          id: uid(),
          name: `Sub-page ${page.subPages.length + 1}`,
          shapes: { ...base.shapes },
          viewport: { ...base.viewport },
        };
    const pages = snapped.pages.map((p) =>
      p.id === snapped.activePageId ? { ...p, subPages: [...p.subPages, created], activeSubPageId: created.id } : p,
    );
    set((s) => ({ projects: { ...s.projects, [currentProjectId]: { ...snapped, pages } } }));
    console.log("[projects] add sub-page", created.id, created.name);
    loadLive(created);
  },

  openSubPage: (subPageId) => {
    const { currentProjectId } = get();
    const project = get().projects[currentProjectId];
    const page = project.pages.find((p) => p.id === project.activePageId);
    if (!page || page.activeSubPageId === subPageId) return;
    if (!page.subPages.some((sp) => sp.id === subPageId)) return;
    console.log("[projects] open sub-page", subPageId);
    set((s) => {
      const snapped = snapshotIntoCurrent(s);
      const pages = snapped.pages.map((p) =>
        p.id === snapped.activePageId ? { ...p, activeSubPageId: subPageId } : p,
      );
      return { projects: { ...s.projects, [currentProjectId]: { ...snapped, pages } } };
    });
    const fresh = get().projects[currentProjectId].pages.find((p) => p.id === project.activePageId)!;
    loadLive(activeSubPage(fresh));
  },

  renameSubPage: (subPageId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) =>
      patchActivePage(s, (p) => ({
        ...p,
        subPages: p.subPages.map((sp) => (sp.id === subPageId ? { ...sp, name: trimmed } : sp)),
      })),
    );
  },

  deleteSubPage: (subPageId) => {
    const { currentProjectId } = get();
    const project = get().projects[currentProjectId];
    const page = project.pages.find((p) => p.id === project.activePageId);
    if (!page) return;
    const target = page.subPages.find((sp) => sp.id === subPageId);
    if (!target || target.pinned) return; // the default sub-page is permanent
    console.log("[projects] delete sub-page", subPageId);
    const wasActive = page.activeSubPageId === subPageId;
    set((s) => {
      const snapped = snapshotIntoCurrent(s);
      const pages = snapped.pages.map((p) => {
        if (p.id !== snapped.activePageId) return p;
        const remaining = p.subPages.filter((sp) => sp.id !== subPageId);
        return { ...p, subPages: remaining, activeSubPageId: wasActive ? remaining[0].id : p.activeSubPageId };
      });
      return { projects: { ...s.projects, [currentProjectId]: { ...snapped, pages } } };
    });
    if (wasActive) {
      const fresh = get().projects[currentProjectId].pages.find((p) => p.id === project.activePageId)!;
      loadLive(activeSubPage(fresh));
    }
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
      const raw = await projectsApi.get(id);
      if (!raw) {
        console.warn("[projects] load: not found", id);
        set({ status: "idle" });
        return;
      }
      const project = normalizeProject(raw);
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
    loadLive(activeSubPage(project.pages[0]));
  },

  hydrate: (snapshot) => {
    const project = snapshot.projects[snapshot.currentProjectId];
    if (!project) return; // ignore a malformed snapshot
    set({
      projects: snapshot.projects,
      currentProjectId: snapshot.currentProjectId,
      recentIds: snapshot.recentIds,
      status: "idle",
    });
    const active = project.pages.find((p) => p.id === project.activePageId) ?? project.pages[0];
    loadLive(activeSubPage(active));
  },
}));

/**
 * Capture the working set with the live canvas folded into its active sub-page —
 * the shape persisted to localStorage so unsaved edits survive a reload.
 */
export function snapshotWorkspace(): WorkspaceSnapshot {
  const s = useProjectsStore.getState();
  const current = snapshotIntoCurrent(s);
  return {
    projects: { ...s.projects, [current.id]: current },
    currentProjectId: s.currentProjectId,
    recentIds: s.recentIds,
  };
}

/**
 * Snapshot the live canvas into the current project's active page and return
 * the updated project (does not mutate; for use inside set()).
 */
function snapshotIntoCurrent(s: ProjectsState): Project {
  const project = s.projects[s.currentProjectId];
  const live = snapshotLive();
  const pages = project.pages.map((page) =>
    page.id === project.activePageId
      ? { ...page, subPages: page.subPages.map((sp) => (sp.id === page.activeSubPageId ? { ...sp, ...live } : sp)) }
      : page,
  );
  return { ...project, pages, updatedAt: Date.now() };
}

/**
 * Normalise a project fetched from the backend so it always conforms to the
 * sub-page document model: every page gets a pinned default sub-page (seeded
 * from any legacy page-level document), every sub-page has a document, and
 * `activeSubPageId` points at a real sub-page. Idempotent for current data.
 */
function normalizeProject(project: Project): Project {
  return { ...project, pages: project.pages.map(normalizePage) };
}

function normalizePage(page: Page): Page {
  const legacy = page as Page & { shapes?: SubPage["shapes"]; viewport?: PageViewport };
  let subPages: SubPage[] = (page.subPages ?? []).map((sp) => ({
    id: sp.id ?? uid(),
    name: sp.name ?? "Sub-page",
    template: sp.template,
    pinned: sp.pinned,
    shapes: sp.shapes ?? {},
    viewport: sp.viewport ?? { ...DEFAULT_VIEWPORT },
  }));
  if (!subPages.some((sp) => sp.pinned)) {
    const def: SubPage = {
      id: uid(),
      name: DEFAULT_SUBPAGE_NAME,
      pinned: true,
      shapes: legacy.shapes ?? {},
      viewport: legacy.viewport ?? { ...DEFAULT_VIEWPORT },
    };
    subPages = [def, ...subPages];
  }
  const active = subPages.find((sp) => sp.id === page.activeSubPageId) ?? subPages.find((sp) => sp.pinned) ?? subPages[0];
  return { id: page.id, name: page.name, subPages, activeSubPageId: active.id };
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
