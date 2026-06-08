import type { Background, Project, WidgetNode } from '@schema/types'
import { createEmptyProject, createWidgetId } from '@schema/index'
import { builtinWidgets } from '@widgets/index'
import {
  DEFAULT_PROJECT_PALETTE,
  PALETTE_EXT_KEY,
  findPaletteTemplate,
  paintPropsWithPalette,
  type ProjectPalette,
  type ProjectPaletteExtension,
} from '@designer/palette'

/**
 * 模板市场 — built-in, pure-frontend dashboard starters.
 *
 * Each template is a flat list of placed widgets on a 1920×1080 canvas plus
 * a reference to a built-in palette template (which supplies both the colour
 * palette and the canvas background). `buildProjectFromTemplate` turns one
 * into a fresh, schema-valid `Project`:
 *
 *   - every widget starts from its `WidgetMeta.defaultProps` (guaranteed to
 *     pass the widget's prop schema) merged with the per-placement override,
 *   - then `paintPropsWithPalette` recolours chart chrome to the palette so
 *     dark themes actually read as dark 大屏,
 *   - the palette is stored under `project.extensions.palette` so widgets
 *     added later inherit it.
 *
 * No backend, no screenshots — card thumbnails are derived from the same
 * layout rects at render time (see TemplateGallery).
 */
export interface PlacedWidget {
  /** Widget registry key, e.g. 'bar-chart'. */
  type: string
  x: number
  y: number
  w: number
  h: number
  /** Shallow override merged over the widget's defaultProps. */
  props?: Record<string, unknown>
}

export interface DashboardTemplate {
  id: string
  name: string
  description: string
  /** Built-in palette template id — seeds palette + canvas background. */
  paletteId: string
  widgets: PlacedWidget[]
}

// ─── Templates ──────────────────────────────────────────────────────

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'sales-dashboard',
    name: '销售数据看板',
    description: '4 项核心指标 + 区域/趋势/渠道分析，深色商务大屏布局。',
    paletteId: 'deep-space',
    widgets: [
      {
        type: 'text',
        x: 60,
        y: 40,
        w: 1800,
        h: 52,
        props: {
          content: '销售数据看板',
          align: 'center',
          valign: 'middle',
          font: { color: '#1E1E1E', size: 30, weight: 'bold' },
        },
      },
      { type: 'number-card', x: 60, y: 120, w: 432, h: 132, props: { label: '总销售额', prefix: '¥', suffix: ' 万' } },
      { type: 'number-card', x: 516, y: 120, w: 432, h: 132, props: { label: '订单总数' } },
      { type: 'number-card', x: 972, y: 120, w: 432, h: 132, props: { label: '客单价', prefix: '¥' } },
      { type: 'number-card', x: 1428, y: 120, w: 432, h: 132, props: { label: '转化率', suffix: '%' } },
      { type: 'bar-chart', x: 60, y: 288, w: 880, h: 350, props: { title: '各区域销售额' } },
      { type: 'line-chart', x: 980, y: 288, w: 880, h: 350, props: { title: '月度销售趋势' } },
      { type: 'donut-chart', x: 60, y: 670, w: 560, h: 350, props: { title: '渠道占比' } },
      { type: 'table', x: 660, y: 670, w: 1200, h: 350 },
    ],
  },
  {
    id: 'monitor-center',
    name: '实时监控中心',
    description: '仪表盘 + 实时趋势 + 运行指标 + 告警列表，霓虹深色风格。',
    paletteId: 'cyber-neon',
    widgets: [
      {
        type: 'text',
        x: 60,
        y: 40,
        w: 1400,
        h: 52,
        props: {
          content: '实时监控中心',
          align: 'left',
          valign: 'middle',
          font: { color: '#1E1E1E', size: 30, weight: 'bold' },
        },
      },
      { type: 'clock', x: 1560, y: 44, w: 300, h: 44 },
      { type: 'gauge-chart', x: 60, y: 130, w: 560, h: 420, props: { title: 'CPU 使用率' } },
      { type: 'area-chart', x: 660, y: 130, w: 1200, h: 420, props: { title: '实时流量监控' } },
      { type: 'number-card', x: 60, y: 576, w: 432, h: 140, props: { label: '在线用户' } },
      { type: 'number-card', x: 516, y: 576, w: 432, h: 140, props: { label: '请求 / 秒' } },
      { type: 'number-card', x: 972, y: 576, w: 432, h: 140, props: { label: '错误率', suffix: '%' } },
      { type: 'number-card', x: 1428, y: 576, w: 432, h: 140, props: { label: '平均延迟', suffix: 'ms' } },
      { type: 'table', x: 60, y: 740, w: 1800, h: 290 },
    ],
  },
  {
    id: 'analytics-overview',
    name: '数据分析概览',
    description: '指标卡 + 趋势 + 占比，明亮简洁，适合周报 / 月报展示。',
    paletteId: 'business-light',
    widgets: [
      {
        type: 'text',
        x: 80,
        y: 48,
        w: 900,
        h: 48,
        props: {
          content: '数据分析概览',
          align: 'left',
          valign: 'middle',
          font: { color: '#1E1E1E', size: 28, weight: 'bold' },
        },
      },
      { type: 'divider', x: 80, y: 110, w: 1760, h: 8 },
      { type: 'number-card', x: 80, y: 140, w: 560, h: 150, props: { label: '总用户数' } },
      { type: 'number-card', x: 680, y: 140, w: 560, h: 150, props: { label: '月活跃度', suffix: '%' } },
      { type: 'number-card', x: 1280, y: 140, w: 560, h: 150, props: { label: '同比增长', suffix: '%' } },
      { type: 'bar-chart', x: 80, y: 330, w: 1080, h: 630, props: { title: '月度数据趋势', showLegend: true } },
      { type: 'pie-chart', x: 1200, y: 330, w: 640, h: 630, props: { title: '分类占比' } },
    ],
  },
]

// ─── Resolution helpers ─────────────────────────────────────────────

/** Palette seeded by the template (falls back to the default palette). */
export function getTemplatePalette(t: DashboardTemplate): ProjectPalette {
  return findPaletteTemplate(t.paletteId)?.palette ?? DEFAULT_PROJECT_PALETTE
}

/** Canvas background seeded by the template, if any. */
export function getTemplateBackground(t: DashboardTemplate): Background | undefined {
  return findPaletteTemplate(t.paletteId)?.background
}

// ─── Builder ────────────────────────────────────────────────────────

const metaByType = new Map(builtinWidgets.map((m) => [m.type, m]))

function placedToNode(p: PlacedWidget, palette: ProjectPalette): WidgetNode {
  const meta = metaByType.get(p.type)
  const base = (meta?.defaultProps ?? {}) as Record<string, unknown>
  let props = paintPropsWithPalette({ ...base, ...(p.props ?? {}) }, palette)

  // `text` carries a lowercase `font` bag that the paint pass deliberately
  // skips — recolour its default dark tone to the palette so titles read on
  // dark canvases (unless the placement set an explicit non-default colour).
  if (p.type === 'text') {
    const font = (props.font ?? {}) as Record<string, unknown>
    if (font.color === undefined || font.color === '#1E1E1E') {
      props = { ...props, font: { ...font, color: palette.text } }
    }
  }
  // KPI numbers should pop in the primary colour (the paint pass sends
  // generic `*Font` keys to the muted tone, which is too dim for a headline).
  if (p.type === 'number-card') {
    const vf = (props.valueFont ?? {}) as Record<string, unknown>
    props = { ...props, valueFont: { ...vf, color: palette.primary } }
  }

  return {
    id: createWidgetId(),
    type: p.type,
    name: meta?.title ?? p.type,
    layout: {
      x: p.x,
      y: p.y,
      width: p.w,
      height: p.h,
      rotate: 0,
      flipX: false,
      flipY: false,
      opacity: 1,
    },
    flags: { locked: false, hidden: false },
    props,
    extensions: {},
  }
}

/**
 * Build a fresh, schema-valid `Project` from a template. Fresh ids +
 * timestamps come from `createEmptyProject`; we then replace the starter
 * page's widgets + background and seed the palette extension.
 */
export function buildProjectFromTemplate(template: DashboardTemplate): Project {
  const palette = getTemplatePalette(template)
  const background = getTemplateBackground(template)
  const project = createEmptyProject({
    name: template.name,
    description: template.description,
  })
  const page = project.pages[0]
  if (page) {
    if (background) page.canvas.background = background
    page.widgets = template.widgets.map((w) => placedToNode(w, palette))
  }
  project.extensions = {
    ...project.extensions,
    [PALETTE_EXT_KEY]: { palette } satisfies ProjectPaletteExtension,
  }
  return project
}
