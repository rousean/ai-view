import {
  createAssetId,
  createDataSourceId,
  createPageId,
  createProjectId,
  createThemeId,
} from '../id';
import type { Page, Project, Theme } from '../types';
import { SCHEMA_VERSION } from '../version';

/** Create a sensible default theme. */
export function createDefaultTheme(): Theme {
  return {
    id: createThemeId(),
    name: 'Default',
    tokens: {
      '--bg': '#0b1220',
      '--fg': '#e6edf6',
      '--primary': '#5b8def',
      '--accent': '#22d3ee',
    },
    palette: ['#5b8def', '#22d3ee', '#34d399', '#fbbf24', '#f97316', '#f472b6'],
    extensions: {},
  };
}

/** Create a default 1920×1080 landscape page with a dark background. */
export function createDefaultPage(name = '页面 1'): Page {
  return {
    id: createPageId(),
    name,
    canvas: {
      width: 1920,
      height: 1080,
      orientation: 'landscape',
      background: { type: 'color', color: '#0b1220' },
    },
    grid: {
      enabled: true,
      size: 20,
      snap: false,
      color: 'rgba(255,255,255,0.06)',
    },
    guides: [],
    widgets: [],
    extensions: {},
  };
}

/**
 * Create a brand new empty project. Used by PersistenceAdapter.create().
 * Caller may override `id`, `name`, `description`.
 */
export function createEmptyProject(opts: {
  name?: string;
  description?: string;
  id?: string;
} = {}): Project {
  const now = new Date().toISOString();
  const theme = createDefaultTheme();
  const page = createDefaultPage();
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
  };
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
  };
}

/** Convenience: blank asset id for "no image". */
export const NULL_ASSET_ID = '';
export { createAssetId };
