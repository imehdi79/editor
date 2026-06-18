/**
 * project.types — the serialisable project/page document model.
 *
 * Kept separate from projects.store so the persistence layer (services/
 * projectsApi) can share these types without importing the store (no cycle).
 * Everything here is plain JSON — exactly what a backend persists/returns.
 */

import type { Shape, ShapeId } from "@/core/drawing-engine/drawing.types";

export interface PageViewport {
  x: number;
  y: number;
  scale: number;
}

/**
 * A sub-page (sub-class) of a page — a named organisational child managed from
 * the page view. Created blank or seeded from a predefined template.
 */
export interface SubPage {
  id: string;
  name: string;
  /** Id of the template this sub-page was created from (undefined when blank). */
  template?: string;
}

export interface Page {
  id: string;
  name: string;
  shapes: Record<ShapeId, Shape>;
  viewport: PageViewport;
  /** Organisational sub-pages shown below the page header. */
  subPages: SubPage[];
}

export interface Project {
  id: string;
  name: string;
  pages: Page[];
  activePageId: string;
  createdAt: number;
  updatedAt: number;
}

/** Lightweight row for the recents / load list (no document payload). */
export interface ProjectSummary {
  id: string;
  name: string;
  pageCount: number;
  updatedAt: number;
}

export const summarize = (p: Project): ProjectSummary => ({
  id: p.id,
  name: p.name,
  pageCount: p.pages.length,
  updatedAt: p.updatedAt,
});
