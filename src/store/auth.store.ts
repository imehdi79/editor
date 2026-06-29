/**
 * auth.store — authentication state for the app.
 *
 * The JWT itself lives in tokenStore (single source of truth + cross-tab sync);
 * this store holds the derived session: the current user and a status the app
 * gates rendering on. It boots by validating any persisted token via /auth/me,
 * and listens for token-clears (a 401 anywhere, or logout in another tab) to
 * drop back to the login screen.
 */

import { create } from "zustand";
import { authApi, type AuthUser, type UserRole } from "@/api/authApi";
import { getToken, setToken, clearToken, subscribeToken } from "@/api/tokenStore";
import { invalidateProjects, clearProjects } from "@/api/queryClient";
import { useProjectsStore } from "./projects.store";
import { loadWorkspaceFor, startWorkspacePersistence, stopWorkspacePersistence } from "./workspace-persistence";

type AuthStatus = "loading" | "authed" | "anon";

// Hardcoded until the backend serves per-user roles; every session is an admin
// for now. Stamped onto the user wherever a session is established below.
const DEFAULT_USER_ROLE: UserRole = "admin";

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  /** Last auth error (login/register), surfaced to the form. */
  error: string | null;
  /** A login/register request is in flight. */
  busy: boolean;
}

interface AuthActions {
  /** Boot: validate a persisted token (if any) via /auth/me. */
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const messageOf = (err: unknown): string =>
  err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.";

// Restore the user's locally-persisted working set (unsaved edits) and start
// persisting going forward. Called wherever a session is established.
const beginSession = (userId: string): void => {
  const snapshot = loadWorkspaceFor(userId);
  if (snapshot) useProjectsStore.getState().hydrate(snapshot);
  startWorkspacePersistence(userId);
};

// Dedupe boot validation: React StrictMode (and remounts) invoke initialize()
// more than once; share a single in-flight run so /auth/me + recents fire once.
let bootRun: Promise<void> | null = null;

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  status: "loading",
  error: null,
  busy: false,

  initialize: async () => {
    if (bootRun) return bootRun;
    bootRun = (async () => {
      if (!getToken()) {
        set({ status: "anon", user: null });
        return;
      }
      set({ status: "loading" });
      try {
        const me = await authApi.me();
        set({ user: { id: me.userId, email: me.email, role: DEFAULT_USER_ROLE }, status: "authed", error: null });
        beginSession(me.userId);
        invalidateProjects();
      } catch {
        // me() already cleared the token on 401; ensure we land on login.
        clearToken();
        set({ status: "anon", user: null });
      }
    })();
    return bootRun;
  },

  login: async (email, password) => {
    set({ busy: true, error: null });
    try {
      const { token, user } = await authApi.login(email, password);
      setToken(token);
      set({ user: { ...user, role: DEFAULT_USER_ROLE }, status: "authed", busy: false });
      beginSession(user.id);
      invalidateProjects();
      return true;
    } catch (err) {
      set({ error: messageOf(err), busy: false });
      return false;
    }
  },

  register: async (email, password) => {
    set({ busy: true, error: null });
    try {
      const { token, user } = await authApi.register(email, password);
      setToken(token);
      set({ user: { ...user, role: DEFAULT_USER_ROLE }, status: "authed", busy: false });
      beginSession(user.id);
      invalidateProjects();
      return true;
    } catch (err) {
      set({ error: messageOf(err), busy: false });
      return false;
    }
  },

  // Clearing the token drives the rest via the subscription below.
  logout: () => clearToken(),

  clearError: () => set({ error: null }),
}));

// React to the token being cleared anywhere — a 401 from any authed call, an
// explicit logout, or a logout in another tab — and reset to a clean, logged-out
// workspace so one user's in-memory projects never bleed into the next.
subscribeToken((token) => {
  if (token) return;
  const { status } = useAuthStore.getState();
  if (status === "loading") return; // boot/validation handles its own transition
  useAuthStore.setState({ user: null, status: "anon" });
  stopWorkspacePersistence(); // keep the stored copy; just stop tracking this session
  useProjectsStore.getState().resetWorkspace();
  clearProjects(); // drop the previous user's cached project lists
});
