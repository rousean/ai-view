import {
  createAssetId,
  createDataSourceId,
  createPageId,
  createProjectId,
  createThemeId,
} from '../id'
import type { Page, Project, Theme } from '../types'
import { SCHEMA_VERSION } from '../version'

/**
 * Default light theme — Figma-style palette per the handoff design.
 * The token names mirror those in src/packages/designer/styles/editor.css.
 */
export function createDefaultTheme(): Theme {
  return {
    id: createThemeId(),
    name: 'Default',
    tokens: {
      // Document
      '--bg': '#ffffff',
      '--fg': '#1e1e1e',
      '--primary': '#0d99ff',
      '--accent': '#0d99ff',
      // Designer chrome — these MIRROR editor.css :root for theming.
      // Components prefer the editor.css fallback; theme overrides win.
      '--panel-bg': '#ffffff',
      '--panel-bg-2': '#fbfbfb',
      '--pasteboard': '#f5f5f5',
      '--canvas-bg': '#e5e5e5',
      '--border': '#e6e6e6',
      '--border-strong': '#d0d0d0',
      '--border-subtle': '#ededed',
      '--text-1': '#1e1e1e',
      '--text-2': '#525252',
      '--text-3': '#8a8a8a',
      '--text-4': '#b3b3b3',
      '--accent-hover': '#0a85e0',
      '--accent-soft': '#e5f4ff',
      '--hover-bg': '#f3f3f3',
      '--selected-bg': '#e5f4ff',
      '--danger': '#f24822',
      // Canvas overlay chrome (still themed for widgets)
      '--grid-color': 'rgba(0,0,0,0.05)',
      '--grid-major-color': 'rgba(0,0,0,0.10)',
      '--ruler-color': '#0d99ff',
      '--selection-color': '#0d99ff',
      '--selection-handle-bg': '#ffffff',
      '--hover-color': 'rgba(13,153,255,0.55)',
      '--alignment-color': '#f24822',
      // Chart (consumed by widgets in JS)
      '--chart-axis-color': 'rgba(0,0,0,0.45)',
      '--chart-split-color': 'rgba(0,0,0,0.06)',
      // Page artboard
      '--page-ring': '0 0 0 1px rgba(0,0,0,0.1)',
      '--page-shadow': '0 16px 48px rgba(0,0,0,0.18)',
    },
    palette: ['#0d99ff', '#00d4ff', '#7c5cff', '#ff5edd', '#fbbf24', '#14ae5c', '#f24822'],
    extensions: {},
  }
}

/** Create a default 1920×1080 landscape page with a light background. */
export function createDefaultPage(name = '页面 1'): Page {
  return {
    id: createPageId(),
    name,
    canvas: {
      width: 1920,
      height: 1080,
      orientation: 'landscape',
      background: { type: 'color', color: '#ffffff' },
    },
    grid: {
      enabled: true,
      size: 20,
      snap: false,
      // Subtle dark grid on light canvas. Falls back to --grid-color from
      // the theme if left unset on the page.
      color: 'rgba(0,0,0,0.05)',
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
  const theme = createDefaultTheme()
  const page = createDefaultPage()
  return {
    version: SCHEMA_VERSION,
    id: opts.id ?? createProjectId(),
    name: opts.name ?? '未命名大屏',
    description: opts.description,
    createdAt: now,
    updatedAt: now,
    pages: [page],
    currentPageId: page.id,
    dataSources: [],
    themes: [theme],
    currentThemeId: theme.id,
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
