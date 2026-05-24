import { createAssetId, createDataSourceId, createPageId, createProjectId } from '../id'
import type { Page, Project } from '../types'
import { SCHEMA_VERSION } from '../version'

/** Create a default 1920×1080 landscape page with a light background. */
export function createDefaultPage(name = '页面 1'): Page {
  return {
    id: createPageId(),
    name,
    canvas: {
      width: 1920,
      height: 1080,
      orientation: 'landscape',
      // CSS var instead of a hard-coded white so the artboard follows the
      // shell theme — light = white, dark = near-black. Pin a literal hex
      // here only when a project should override that behaviour.
      background: { type: 'color', color: 'var(--background)' },
    },
    grid: {
      enabled: true,
      size: 20,
      snap: false,
      // Leave `color` unset so GridLayer falls back to the brand --primary
      // tint. Set explicitly on a page only when overriding the brand grid.
    },
    guides: [],
    widgets: [],
    extensions: {},
  }
}

/**
 * Create a brand new empty project. Used by PersistenceAdapter.create().
 * Caller may override `id`, `name`, `description`.
 */
export function createEmptyProject(
  opts: {
    name?: string
    description?: string
    id?: string
  } = {},
): Project {
  const now = new Date().toISOString()
  const page = createDefaultPage()
  return {
    version: SCHEMA_VERSION,
    id: opts.id ?? createProjectId(),
    name: opts.name ?? '未命名大屏',
    description: opts.description,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    pages: [page],
    currentPageId: page.id,
    dataSources: [],
    assets: [],
    extensions: {},
  }
}

/** Useful helper for tests/setup: stable mock data source. */
export function createSampleStaticDataSource() {
  return {
    id: createDataSourceId(),
    name: '示例数据',
    type: 'static' as const,
    schema: {
      fields: [
        { name: 'category', type: 'string' as const },
        { name: 'value', type: 'number' as const },
      ],
    },
    data: [
      { category: '一月', value: 120 },
      { category: '二月', value: 200 },
      { category: '三月', value: 150 },
      { category: '四月', value: 80 },
      { category: '五月', value: 70 },
      { category: '六月', value: 110 },
    ],
    extensions: {},
  }
}

/** Convenience: blank asset id for "no image". */
export const NULL_ASSET_ID = ''
export { createAssetId }
