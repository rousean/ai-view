import * as React from 'react'
import type { Project, ProjectSummary, ProjectStatus } from '@schema/types'
import { LocalStoragePersistence } from '@schema/index'
import { buildProjectFromTemplate, type DashboardTemplate } from './templates/dashboard-templates'

/**
 * Tiny event bus to keep the management surface in sync without pulling in
 * a query library.
 *
 *   - any mutation (create / delete / status change / editor save) fires
 *     `aiview:projects-changed`
 *   - any view that reads the project list subscribes and re-fetches
 *   - `storage` is also subscribed so cross-tab edits propagate
 */
const PROJECTS_CHANGED_EVENT = 'aiview:projects-changed'

export function notifyProjectsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROJECTS_CHANGED_EVENT))
  }
}

/** Extended summary with management-specific bits computed once at list time. */
export interface ScreenListItem extends ProjectSummary {
  status: ProjectStatus
}

const adapter = new LocalStoragePersistence()

async function loadList(): Promise<ScreenListItem[]> {
  const summaries = await adapter.list()
  // Pull each project to read its status (not in summary). This is fine for
  // localStorage — synchronous & small. With a real backend we'd extend the
  // list endpoint to include status.
  const items: ScreenListItem[] = []
  for (const s of summaries) {
    try {
      const p = await adapter.load(s.id)
      items.push({ ...s, status: p.status ?? 'draft' })
    } catch {
      // Skip corrupt/missing entries silently — they're filtered out of
      // the UI but remain in the index until something explicitly cleans up.
    }
  }
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/**
 * Returns the current project list, sorted most-recently-updated first.
 * Refetches when:
 *   1. another part of the app fires `notifyProjectsChanged()`
 *   2. localStorage changes in another tab (`storage` event)
 *   3. the consumer calls `refresh()` explicitly
 */
export function useProjects() {
  const [items, setItems] = React.useState<ScreenListItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    try {
      const list = await loadList()
      setItems(list)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
    const handler = () => {
      void refresh()
    }
    window.addEventListener(PROJECTS_CHANGED_EVENT, handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener(PROJECTS_CHANGED_EVENT, handler)
      window.removeEventListener('storage', handler)
    }
  }, [refresh])

  return { items, loading, error, refresh }
}

/** Convenience: just the count, used by the sidebar badge. */
export function useProjectCount(): number | undefined {
  const { items, loading } = useProjects()
  return loading ? undefined : items.length
}

// ─── Mutations (each one fires `notifyProjectsChanged`) ─────────────────────

export async function createNewProject(name?: string): Promise<Project> {
  const project = await adapter.create({ name: name ?? '未命名大屏' })
  notifyProjectsChanged()
  return project
}

/**
 * Instantiate a new project from a built-in template — builds a fully
 * populated, themed project and persists it. The new project owns its
 * content outright (fresh ids); the template is just the seed.
 */
export async function createProjectFromTemplate(
  template: DashboardTemplate,
): Promise<Project> {
  const project = buildProjectFromTemplate(template)
  await adapter.save(project)
  notifyProjectsChanged()
  return project
}

export async function deleteProject(id: string): Promise<void> {
  await adapter.delete(id)
  notifyProjectsChanged()
}

export async function duplicateProject(id: string): Promise<Project> {
  const src = await adapter.load(id)
  const copy = await adapter.create({
    name: `${src.name} - 副本`,
    description: src.description,
  })
  // Replace the empty pages with the source's content (preserves widgets).
  await adapter.save({
    ...copy,
    pages: src.pages,
    currentPageId: src.currentPageId,
    dataSources: src.dataSources,
    assets: src.assets,
    status: src.status ?? 'draft',
    extensions: src.extensions,
  })
  notifyProjectsChanged()
  return copy
}

export async function renameProject(id: string, name: string): Promise<void> {
  const project = await adapter.load(id)
  await adapter.save({ ...project, name })
  notifyProjectsChanged()
}

export async function setProjectStatus(id: string, status: ProjectStatus): Promise<void> {
  const project = await adapter.load(id)
  await adapter.save({ ...project, status })
  notifyProjectsChanged()
}

/**
 * Download one project as JSON. Filename = sanitised project name.
 * Browser-only: builds a Blob + clicks a synthetic <a download>, no
 * server round-trip.
 */
export async function exportProjectAsJson(id: string): Promise<void> {
  const json = await adapter.exportJson(id)
  const project = await adapter.load(id)
  triggerDownload(`${sanitizeFilename(project.name)}.json`, json)
}

/** Same as above but for a batch — produces a single `.json` file with an array. */
export async function exportProjectsAsJson(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  if (ids.length === 1) return exportProjectAsJson(ids[0]!)
  const projects = await Promise.all(ids.map((id) => adapter.load(id)))
  const json = JSON.stringify(projects, null, 2)
  triggerDownload(`aiview-screens-${new Date().toISOString().slice(0, 10)}.json`, json)
}

/**
 * Read a `.json` file (single project object or an array thereof),
 * import each via the adapter, return how many landed. Caller's
 * responsibility to surface success/failure to the user.
 */
export async function importProjectsFromFile(file: File): Promise<number> {
  const text = await file.text()
  const parsed = JSON.parse(text) as unknown
  const list = Array.isArray(parsed) ? parsed : [parsed]
  let n = 0
  for (const p of list) {
    try {
      await adapter.importJson(JSON.stringify(p))
      n++
    } catch (err) {
      console.warn('[importProjectsFromFile] skipped invalid project', err)
    }
  }
  notifyProjectsChanged()
  return n
}

function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function sanitizeFilename(name: string): string {
  // Strip filesystem-reserved chars; collapse whitespace; cap length.
  return (
    name
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || 'untitled'
  )
}

export { adapter as projectsAdapter }
