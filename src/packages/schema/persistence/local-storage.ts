import { migrate } from '../migrations'
import { ProjectSchema } from '../schemas/project'
import type { Project, ProjectSummary } from '../types'
import type { PersistenceAdapter } from './adapter'
import { createEmptyProject } from './factory'

const PROJECT_KEY_PREFIX = 'aiview:project:'
const INDEX_KEY = 'aiview:project-index'

interface IndexEntry {
  id: string
  name: string
  description?: string
  thumbnail?: string
  updatedAt: string
}

function readIndex(): IndexEntry[] {
  if (typeof localStorage === 'undefined') return []
  const raw = localStorage.getItem(INDEX_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as IndexEntry[]
  } catch {
    return []
  }
}

function writeIndex(entries: IndexEntry[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(INDEX_KEY, JSON.stringify(entries))
}

function projectKey(id: string): string {
  return PROJECT_KEY_PREFIX + id
}

/**
 * MVP persistence backed by localStorage. Suitable for development and
 * single-user demos. Replace with HttpPersistence (or similar) when
 * the backend lands — the rest of the system requires no changes.
 *
 * Limitations:
 * - localStorage caps at ~5MB per origin in most browsers.
 * - Synchronous I/O wrapped in Promise.resolve for API parity.
 * - No conflict detection (last-write-wins).
 */
export class LocalStoragePersistence implements PersistenceAdapter {
  async load(projectId: string): Promise<Project> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available in this environment')
    }
    const raw = localStorage.getItem(projectKey(projectId))
    if (!raw) throw new Error(`Project not found: ${projectId}`)

    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch (err) {
      throw new Error(`Project ${projectId} is corrupt: ${(err as Error).message}`)
    }

    const migrated = migrate(data)
    const parsed = ProjectSchema.safeParse(migrated)
    if (!parsed.success) {
      throw new Error(`Project ${projectId} failed validation: ${parsed.error.message}`)
    }
    return parsed.data as Project
  }

  async save(project: Project): Promise<void> {
    if (typeof localStorage === 'undefined') return

    const updated: Project = {
      ...project,
      updatedAt: new Date().toISOString(),
    }

    localStorage.setItem(projectKey(updated.id), JSON.stringify(updated))

    // Update index.
    const idx = readIndex()
    const existing = idx.findIndex((e) => e.id === updated.id)
    const entry: IndexEntry = {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      updatedAt: updated.updatedAt,
    }
    if (existing >= 0) idx[existing] = entry
    else idx.push(entry)
    writeIndex(idx)
  }

  async list(): Promise<ProjectSummary[]> {
    return readIndex().map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      thumbnail: e.thumbnail,
      updatedAt: e.updatedAt,
    }))
  }

  async create(opts: { name: string; description?: string }): Promise<Project> {
    const project = createEmptyProject(opts)
    await this.save(project)
    return project
  }

  async delete(projectId: string): Promise<void> {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(projectKey(projectId))
    const idx = readIndex().filter((e) => e.id !== projectId)
    writeIndex(idx)
  }

  async exportJson(projectId: string): Promise<string> {
    const project = await this.load(projectId)
    return JSON.stringify(project, null, 2)
  }

  async importJson(json: string): Promise<Project> {
    const data = JSON.parse(json)
    const migrated = migrate(data)
    const parsed = ProjectSchema.safeParse(migrated)
    if (!parsed.success) {
      throw new Error(`Imported JSON failed validation: ${parsed.error.message}`)
    }
    await this.save(parsed.data as Project)
    return parsed.data as Project
  }
}
