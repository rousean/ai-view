import type { Project, ProjectSummary } from '../types'

/**
 * Persistence adapter — abstracts where projects live (localStorage,
 * IndexedDB, HTTP server, etc.).
 *
 * The designer instance receives an adapter at construction. Switching
 * backends (e.g. from localStorage to a real API) requires only swapping
 * the adapter; no business code change.
 */
export interface PersistenceAdapter {
  /** Load a project by id. Throws if not found. */
  load(projectId: string): Promise<Project>

  /** Save a project (full replace; no diffing here). */
  save(project: Project): Promise<void>

  /** List all projects (lightweight summaries). */
  list(): Promise<ProjectSummary[]>

  /** Create a new empty project; returns the new project. */
  create(opts: { name: string; description?: string }): Promise<Project>

  /** Delete a project. Idempotent. */
  delete(projectId: string): Promise<void>

  /** Export a project as a JSON string. */
  exportJson(projectId: string): Promise<string>

  /** Import a project from a JSON string. Returns the parsed project. */
  importJson(json: string): Promise<Project>
}
