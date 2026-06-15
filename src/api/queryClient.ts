/**
 * queryClient — the app-wide React Query client + project query keys.
 *
 * Caching the project lists here means reopening the Projects hub doesn't refetch
 * on every click: a fetch only happens when the cache is stale (staleTime) or after
 * a mutation invalidates it. Mutations (save / delete) call invalidateProjects();
 * logout calls clearProjects() so the next user never sees cached data.
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min — reopening the hub within a minute uses cache
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const projectsKeys = {
  all: ["projects"] as const,
  recent: (limit: number) => ["projects", "recent", limit] as const,
  list: () => ["projects", "list"] as const,
};

/** Mark every project list stale so observed queries refetch (after save/delete). */
export const invalidateProjects = (): void => {
  void queryClient.invalidateQueries({ queryKey: projectsKeys.all });
};

/** Drop cached project lists entirely (on logout / user switch). */
export const clearProjects = (): void => {
  queryClient.removeQueries({ queryKey: projectsKeys.all });
};
