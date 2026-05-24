import type { Project } from '../types'
import { SCHEMA_VERSION } from '../version'

/**
 * A migration upgrades a project from `from` version to `to` version.
 * Mutate the input or return a new object — both are accepted.
 */
export interface Migration {
  from: string
  to: string
  up(project: unknown): unknown
}

/**
 * Migration registry — append in chronological order.
 *
 * Each entry is applied automatically when a project is loaded; the chain
 * runs until `current.version === SCHEMA_VERSION`. See `migrate()` below.
 */
const migrations: Migration[] = [
  /**
   * v1.0.0 → v1.1.0
   * Replace the hard-coded `#ffffff` artboard fill that older projects
   * shipped with by a CSS var that follows the app theme. Projects that
   * deliberately picked any other colour are untouched.
   */
  {
    from: '1.0.0',
    to: '1.1.0',
    up(project) {
      const p = project as {
        version: string
        pages: Array<{
          canvas: { background: { type: string; color?: string } }
        }>
      }
      for (const page of p.pages ?? []) {
        const bg = page.canvas?.background
        if (bg && bg.type === 'color' && bg.color === '#ffffff') {
          bg.color = 'var(--background)'
        }
      }
      return p
    },
  },
]

/**
 * Compare semver-ish version strings. Returns -1 / 0 / 1.
 * Accepts simple x.y.z forms; ignores pre-release tags.
 */
export function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da > db) return 1
    if (da < db) return -1
  }
  return 0
}

/**
 * Walk the migration chain to upgrade a project to the current version.
 * Throws if no path exists from the project's version.
 */
export function migrate(input: unknown): unknown {
  if (!input || typeof input !== 'object' || !('version' in input)) {
    throw new Error('migrate: input is missing `version` field')
  }
  let current = input as { version: string }
  const target = SCHEMA_VERSION

  if (compareVersion(current.version, target) === 0) return current
  if (compareVersion(current.version, target) > 0) {
    throw new Error(`Project version ${current.version} is newer than schema version ${target}`)
  }

  // Apply migrations sequentially while a matching `from` exists.
  while (compareVersion(current.version, target) < 0) {
    const next = migrations.find((m) => m.from === current.version)
    if (!next) {
      throw new Error(`No migration path from ${current.version} to ${target}`)
    }
    current = next.up(current) as { version: string }
    current.version = next.to
  }
  return current
}

/** Test helper / typing helper. */
export const __SCHEMA_VERSION__ = SCHEMA_VERSION
export type { Project }
