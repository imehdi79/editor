/**
 * workspace-persistence — keep the live working set in localStorage so unsaved
 * edits survive a page reload.
 *
 * "Save" (in the Projects drawer) persists to the backend; this is the safety
 * net for everything between those saves. It snapshots the projects tree with
 * the live canvas folded in (debounced) on every committed document / viewport /
 * project change, and restores it on boot.
 *
 * Storage is keyed per user so one account's drawings never bleed into another's
 * on a shared browser. Start it once the session is known (auth.store), and stop
 * it on logout — the persisted copy is kept so the user's work returns next time.
 */

import { useFloorPlanStore } from "./floor-plan.store";
import { useViewportStore } from "./viewport.store";
import { useProjectsStore, snapshotWorkspace, type WorkspaceSnapshot } from "./projects.store";

const VERSION = 1;
const keyFor = (userId: string) => `mehdify.workspace.v${VERSION}.${userId}`;

interface PersistedShape extends WorkspaceSnapshot {
  v: number;
}

const isValid = (data: PersistedShape): boolean =>
  data?.v === VERSION &&
  !!data.projects &&
  typeof data.currentProjectId === "string" &&
  !!data.projects[data.currentProjectId];

/** Read a user's persisted working set, or null if absent / unreadable / stale. */
export function loadWorkspaceFor(userId: string): WorkspaceSnapshot | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedShape;
    if (!isValid(data)) return null;
    return { projects: data.projects, currentProjectId: data.currentProjectId, recentIds: data.recentIds ?? [] };
  } catch {
    return null; // corrupt JSON / disabled storage — fall back to a fresh workspace
  }
}

let writeTimer: ReturnType<typeof setTimeout> | undefined;
let unsubscribers: (() => void)[] = [];
let activeUserId: string | null = null;

const flush = () => {
  if (!activeUserId) return;
  try {
    const payload: PersistedShape = { v: VERSION, ...snapshotWorkspace() };
    localStorage.setItem(keyFor(activeUserId), JSON.stringify(payload));
  } catch {
    // quota exceeded / private mode — drop this write rather than crash the app.
  }
};

const schedule = () => {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(flush, 600);
};

/**
 * Begin persisting the live working set for `userId`. Subscribes to the document
 * (commit-granular), viewport, and projects stores; each change debounces a
 * write. Idempotent — calling again re-targets the active user.
 */
export function startWorkspacePersistence(userId: string): void {
  stopWorkspacePersistence();
  activeUserId = userId;
  unsubscribers = [
    useFloorPlanStore.subscribe(schedule),
    useViewportStore.subscribe(schedule),
    useProjectsStore.subscribe(schedule),
  ];
}

/** Stop persisting (logout). Keeps the stored copy for the user's next session. */
export function stopWorkspacePersistence(): void {
  clearTimeout(writeTimer);
  unsubscribers.forEach((off) => off());
  unsubscribers = [];
  activeUserId = null;
}
