/**
 * router.store — a minimal History-API router for the app's top-level pages.
 *
 * The app is a single editor surface plus a few standalone pages (currently the
 * admin panel). Rather than pull in a routing library, we keep the active page
 * in this store, drive it from the URL pathname, and push new paths on navigate.
 * Add a page by extending `AppRoute` + `PATH_FOR` and rendering it in App.
 */

import { create } from "zustand";

export type AppRoute = "editor" | "admin";

const PATH_FOR: Record<AppRoute, string> = {
  editor: "/",
  admin: "/admin",
};

const routeFromPath = (pathname: string): AppRoute =>
  pathname.startsWith("/admin") ? "admin" : "editor";

interface RouterState {
  route: AppRoute;
  /** Push a new top-level page and update the URL. */
  navigate: (route: AppRoute) => void;
}

export const useRouterStore = create<RouterState>((set) => ({
  route: routeFromPath(window.location.pathname),
  navigate: (route) => {
    window.history.pushState(null, "", PATH_FOR[route]);
    set({ route });
  },
}));

// Keep the store in sync with browser back/forward.
window.addEventListener("popstate", () => {
  useRouterStore.setState({ route: routeFromPath(window.location.pathname) });
});
