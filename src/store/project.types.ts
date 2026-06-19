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
 * A sub-page (sub-class) of a page — the actual drawing surface. Each carries
 * its own document (shapes + viewport) and is rendered on the live canvas like a
 * page. Created blank (copies the page's pinned default) or from a template.
 */
export interface SubPage {
  id: string;
  name: string;
  /** Id of the template this sub-page was created from (undefined when blank). */
  template?: string;
  /** The page's default sub-page: always present and cannot be removed. */
  pinned?: boolean;
  shapes: Record<ShapeId, Shape>;
  viewport: PageViewport;
}

export interface Page {
  id: string;
  name: string;
  /** Drawing surfaces of this page; always holds at least the pinned default. */
  subPages: SubPage[];
  activeSubPageId: string;
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
