/**
 * projectsApi — the persistence boundary for projects.
 *
 * The store talks to this async interface, never to a transport directly. The
 * live backend (NestJS) is wired via `HttpProjectsApi`, which routes every call
 * through the shared `apiFetch` (auth header + error envelope + 401 handling).
 * `LocalProjectsApi` (in-memory) remains as an offline fallback — swap the
 * exported instance to use it.
 */

import type { Project, ProjectSummary } from "@/store/project.types";
import { summarize } from "@/store/project.types";
import { apiFetch, ApiError } from "@/api/client";

export interface ProjectsApi {
  /** List the user's project summaries, most-recently-saved first. */
  list(): Promise<ProjectSummary[]>;
  /** Recently-saved project summaries (default 10). */
  recent(limit?: number): Promise<ProjectSummary[]>;
  /** Fetch a full project (with pages + shapes), or null if missing / not owned. */
  get(id: string): Promise<Project | null>;
  /** Upsert a full project (client-supplied id). Returns the stored copy. */
  save(project: Project): Promise<Project>;
  /** Delete a project. */
  remove(id: string): Promise<void>;
}

const clone = <T>(v: T): T =>
  typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------------------
// In-memory implementation (offline fallback)
// ---------------------------------------------------------------------------

export class LocalProjectsApi implements ProjectsApi {
  private store = new Map<string, Project>();

  async list(): Promise<ProjectSummary[]> {
    return [...this.store.values()].sort((a, b) => b.updatedAt - a.updatedAt).map(summarize);
  }

  async recent(limit = 10): Promise<ProjectSummary[]> {
    return (await this.list()).slice(0, limit);
  }

  async get(id: string): Promise<Project | null> {
    const p = this.store.get(id);
    return p ? clone(p) : null;
  }

  async save(project: Project): Promise<Project> {
    const stored = clone(project);
    this.store.set(project.id, stored);
    return clone(stored);
  }

  async remove(id: string): Promise<void> {
    this.store.delete(id);
  }
}

// ---------------------------------------------------------------------------
// HTTP implementation — all calls authenticated via apiFetch
// ---------------------------------------------------------------------------

export class HttpProjectsApi implements ProjectsApi {
  list(): Promise<ProjectSummary[]> {
    return apiFetch<ProjectSummary[]>("/projects");
  }

  recent(limit = 10): Promise<ProjectSummary[]> {
    return apiFetch<ProjectSummary[]>(`/projects/recent?limit=${encodeURIComponent(limit)}`);
  }

  async get(id: string): Promise<Project | null> {
    try {
      return await apiFetch<Project>(`/projects/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  save(project: Project): Promise<Project> {
    return apiFetch<Project>(`/projects/${encodeURIComponent(project.id)}`, { method: "PUT", body: project });
  }

  async remove(id: string): Promise<void> {
    try {
      await apiFetch<void>(`/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return; // idempotent
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Active instance — live against the backend.
// Fall back to the in-memory store with: new LocalProjectsApi()
// ---------------------------------------------------------------------------

export const projectsApi: ProjectsApi = new HttpProjectsApi();
// export const projectsApi: ProjectsApi = new LocalProjectsApi();
