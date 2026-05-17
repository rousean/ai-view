import type { Asset } from './asset';
import type { DataSource } from './data-source';
import type { Page } from './page';
import type { Theme } from './theme';

/**
 * Project — root document. Serializing this to JSON produces a complete
 * standalone large-screen artifact. Loaded by PersistenceAdapter.load().
 */
export interface Project {
  /** Schema version (semver). Used by migrations to upgrade older JSON. */
  version: string;

  id: string;
  name: string;
  description?: string;

  /** ISO 8601 timestamps. */
  createdAt: string;
  updatedAt: string;

  /** Pages in display order. Always non-empty. */
  pages: Page[];

  /** Currently active page (in design and runtime). */
  currentPageId: string;

  /** Shared resources used across pages. */
  dataSources: DataSource[];
  themes: Theme[];
  currentThemeId: string;
  assets: Asset[];

  /** Plugin-private namespace. */
  extensions: Record<string, unknown>;
}

/** Lightweight summary used in project lists / load dialogs. */
export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  updatedAt: string;
}
