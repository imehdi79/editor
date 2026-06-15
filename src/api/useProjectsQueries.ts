/**
 * React Query hooks for the project lists. Backed by projectsApi; cached by the
 * shared queryClient so the Projects hub doesn't refetch on every open.
 */

import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/services/projectsApi";
import { projectsKeys } from "./queryClient";

export const useRecentProjects = (limit = 10, enabled = true) =>
  useQuery({
    queryKey: projectsKeys.recent(limit),
    queryFn: () => projectsApi.recent(limit),
    enabled,
  });

export const useAllProjects = (enabled = true) =>
  useQuery({
    queryKey: projectsKeys.list(),
    queryFn: () => projectsApi.list(),
    enabled,
  });
