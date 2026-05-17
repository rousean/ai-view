import {
  createAssetId,
  createDataSourceId,
  createPageId,
  createProjectId,
  createThemeId,
} from '../id';
import type { Page, Project, Theme } from '../types';
import { SCHEMA_VERSION } from '../version';

/** Create a sensible default theme. Light by default. */
export function createDefaultTheme(): Theme {
  return {
    id: createThemeId(),
    name: 'Default',
    tokens: {
      // Document colours
      '--bg': '#ffffff',
      '--fg': '#1f2937',
      '--primary': '#3b82f6',
      '--accent': '#06b6d4',
      // Designer chrome — grid, ruler, selection. Themed so dark /
      // alternate palettes can override without touching components.
      '--grid-color': 'rgba(0,0,0,0.05)',
      '--grid-major-color': 'rgba(0,0,0,0.10)',
      '--ruler-color': '#3b82f6',
      '--selection-color': '#3b82f6',
      '--selection-handle-bg': '#ffffff',
      '--hover-color': 'rgba(59,130,246,0.55)',
      '--alignment-color': '#db2777',
      // Chart chrome (consumed by widgets via JS, not CSS — echarts
      // option values must be concrete strings).
      '--chart-axis-color': 'rgba(0,0,0,0.45)',
      '--chart-split-color': 'rgba(0,0,0,0.06)',
      // Page artboard chrome (CSS-only).
      '--page-ring': '0 0 0 1px rgba(0,0,0,0.08)',
      '--page-shadow': '0 12px 36px rgba(0,0,0,0.18)',
    },
    palette: ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#ec4899'],
    extensions: {},
  };
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
