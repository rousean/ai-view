import * as React from 'react'
import {
  ChartBar,
  ChartLine,
  ChartPie,
  ChevronDown,
  Copy,
  Database,
  Hash,
  MoreHorizontal,
  Radar,
  Table,
  Trash2,
  Type as TextIcon,
} from 'lucide-react'
import type { Background, WidgetNode } from '@schema/types'
import type { PropConfig, WidgetMeta } from '@widgets/widget-meta'
import { ScrollArea } from '~/components/ui/scroll-area'
import { useDashboardEditor, useDocumentState, useEditorState } from '../editor/editor-context'
import { getByPath, setByPath } from '../setters/path-utils'
import { selectCurrentPage, selectCurrentTheme, selectWidget } from '../stores/selectors'
import {
  ColorInput,
  NumInput,
  PropRow,
  PropSection,
  Segmented,
  Toggle,
} from './property-controls'

/**
 * Right-side property panel — Figma-style with two top tabs (画布 / 图表).
 * 画布 tab edits page-level config (size, background, grid, theme, fit mode).
 * 图表 tab edits the selected widget; sections come from WidgetMeta.propsConfig.
 */
export function PropertyPanel() {
  const selectedIds = useEditorState((s) => s.selectedIds)
  const [tab, setTab] = React.useState<'canvas' | 'chart'>(
    selectedIds.length === 1 ? 'chart' : 'canvas',
  )
  React.useEffect(() => {
    setTab(selectedIds.length === 1 ? 'chart' : 'canvas')
  }, [selectedIds.length])

  return (
    <aside
      className="flex w-[var(--panel-w-right)] shrink-0 flex-col border-l"
      style={{
        background: 'var(--panel-bg)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="tabs shrink-0">
        <button
          className={'tab ' + (tab === 'canvas' ? 'active' : '')}
          onClick={() => setTab('canvas')}
        >
          画布
        </button>
        <button
          className={'tab ' + (tab === 'chart' ? 'active' : '')}
          onClick={() => setTab('chart')}
        >
          图表
          {selectedIds.length === 1 && (
            <span
              className="ml-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
              style={{ background: 'var(--accent)' }}
            />
          )}
        </button>
        <div className="flex-1" />
        <button
          className="btn btn-ghost-icon mr-1 self-center"
          aria-label="更多"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {tab === 'canvas' ? <CanvasProps /> : <ChartProps />}
      </ScrollArea>
    </aside>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 画布 tab — page-level config
// ═══════════════════════════════════════════════════════════════════

function CanvasProps() {
  const editor = useDashboardEditor()
  const page = useDocumentState((s) => selectCurrentPage(s))
  const theme = useDocumentState((s) => selectCurrentTheme(s))
  if (!page) return null

  const bg = page.canvas.background
  const bgType = bg.type
  const startColor =
    bg.type === 'color'
      ? bg.color
      : bg.type === 'gradient'
        ? (bg.gradient.stops[0]?.color ?? '#ffffff')
        : '#ffffff'
  const endColor =
    bg.type === 'gradient'
      ? (bg.gradient.stops[bg.gradient.stops.length - 1]?.color ?? '#000000')
      : '#000000'
  const angle = bg.type === 'gradient' ? (bg.gradient.angle ?? 180) : 180

  const setBackground = (next: Background) =>
    editor.execute('canvas.setBackground', { background: next })

  return (
    <>
      <PropSection title="尺寸">
        <PropRow label="宽 × 高">
          <NumInput
            value={page.canvas.width}
            onChange={(w) => editor.setCanvasSize(w, page.canvas.height)}
          />
          <span className="t-4">×</span>
          <NumInput
            value={page.canvas.height}
            onChange={(h) => editor.setCanvasSize(page.canvas.width, h)}
          />
        </PropRow>
        <PropRow label="比例">
          <Segmented
            value={ratioOf(page.canvas.width, page.canvas.height)}
            onChange={(r) => {
              const presets: Record<string, [number, number]> = {
                '16:9': [1920, 1080],
                '21:9': [2560, 1080],
                '4:3': [1600, 1200],
              }
              const target = presets[r]
              if (target) editor.setCanvasSize(target[0], target[1])
            }}
            options={[
              { value: '16:9', label: '16:9' },
              { value: '21:9', label: '21:9' },
              { value: '4:3', label: '4:3' },
              { value: '自由', label: '自由' },
            ]}
          />
        </PropRow>
      </PropSection>

      <PropSection title="背景">
        <PropRow label="类型">
          <Segmented
            value={bgType === 'color' ? '纯色' : bgType === 'gradient' ? '渐变' : '图片'}
            onChange={(t) => {
              if (t === '纯色') setBackground({ type: 'color', color: startColor })
              else if (t === '渐变')
                setBackground({
                  type: 'gradient',
                  gradient: {
                    type: 'linear',
                    angle,
                    stops: [
                      { offset: 0, color: startColor },
                      { offset: 1, color: endColor },
                    ],
                  },
                })
              else setBackground({ type: 'image', assetId: '', fit: 'cover' })
            }}
            options={[
              { value: '纯色', label: '纯色' },
              { value: '渐变', label: '渐变' },
              { value: '图片', label: '图片' },
            ]}
          />
        </PropRow>
        {bgType === 'color' && (
          <PropRow label="颜色">
            <ColorInput
              value={startColor}
              onChange={(c) => setBackground({ type: 'color', color: c })}
            />
          </PropRow>
        )}
        {bgType === 'gradient' && (
          <>
            <PropRow label="起始色">
              <ColorInput
                value={startColor}
                onChange={(c) =>
                  setBackground({
                    type: 'gradient',
                    gradient: {
                      type: 'linear',
                      angle,
                      stops: [
                        { offset: 0, color: c },
                        { offset: 1, color: endColor },
                      ],
                    },
                  })
                }
              />
            </PropRow>
            <PropRow label="终止色">
              <ColorInput
                value={endColor}
                onChange={(c) =>
                  setBackground({
                    type: 'gradient',
                    gradient: {
                      type: 'linear',
                      angle,
                      stops: [
                        { offset: 0, color: startColor },
                        { offset: 1, color: c },
                      ],
                    },
                  })
                }
              />
            </PropRow>
            <PropRow label="角度">
              <NumInput
                value={angle}
                suffix="°"
                onChange={(a) =>
                  setBackground({
                    type: 'gradient',
                    gradient: {
                      type: 'linear',
                      angle: a,
                      stops: [
                        { offset: 0, color: startColor },
                        { offset: 1, color: endColor },
                      ],
                    },
                  })
                }
              />
            </PropRow>
          </>
        )}
      </PropSection>

      <PropSection title="栅格">
        <PropRow label="显示栅格">
          <Toggle on={page.grid.enabled} onChange={(on) => editor.setGrid({ enabled: on })} />
        </PropRow>
        <PropRow label="栅格尺寸">
          <NumInput
            value={page.grid.size}
            suffix="px"
            onChange={(n) => editor.setGrid({ size: n })}
          />
        </PropRow>
        <PropRow label="对齐栅格">
          <Toggle on={page.grid.snap} onChange={(on) => editor.setGrid({ snap: on })} />
        </PropRow>
      </PropSection>

      {theme && (
        <PropSection title="主题色">
          <div className="px-3 pt-1 pb-2">
            <div className="grid grid-cols-7 gap-1.5">
              {theme.palette.map((c, i) => (
                <div
                  key={c + i}
                  className="aspect-square cursor-pointer rounded"
                  style={{
                    background: c,
                    boxShadow:
                      i === 0
                        ? '0 0 0 2px var(--panel-bg), 0 0 0 4px var(--accent)'
                        : '0 0 0 1px rgba(0,0,0,.1)',
                  }}
                />
              ))}
            </div>
            <div className="t-3 t-xs mt-2">{theme.name} · 应用于所有图表</div>
          </div>
        </PropSection>
      )}
    </>
  )
}

function ratioOf(w: number, h: number): string {
  const r = w / h
  if (Math.abs(r - 16 / 9) < 0.02) return '16:9'
  if (Math.abs(r - 21 / 9) < 0.02) return '21:9'
  if (Math.abs(r - 4 / 3) < 0.02) return '4:3'
  return '自由'
}

// ═══════════════════════════════════════════════════════════════════
// 图表 tab — widget-level config
// ═══════════════════════════════════════════════════════════════════

const WIDGET_TYPE_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  'bar-chart': ChartBar,
  'line-chart': ChartLine,
  'pie-chart': ChartPie,
  'donut-chart': ChartPie,
  'radar-chart': Radar,
  text: TextIcon,
  number: Hash,
  table: Table,
}

function ChartProps() {
  const editor = useDashboardEditor()
  const selectedIds = useEditorState((s) => s.selectedIds)
  const primaryId = useEditorState((s) => s.primarySelectionId)
  const widget = useDocumentState((s) =>
    primaryId ? (selectWidget(primaryId)(s) ?? null) : null,
  )

  if (selectedIds.length === 0) {
    return (
      <div
        className="p-6 text-center"
        style={{ color: 'var(--text-3)' }}
      >
        <ChartBar size={28} stroke="var(--text-4)" />
        <div className="mt-2.5 text-[13px]">未选中图表</div>
        <div className="t-4 t-xs mt-1">在画布中点击图表以查看属性</div>
      </div>
    )
  }
  if (selectedIds.length > 1) {
    return (
      <div
        className="p-6 text-center"
        style={{ color: 'var(--text-3)' }}
      >
        <div className="text-[13px]">已选中 {selectedIds.length} 个图表</div>
        <div className="t-4 t-xs mt-1">多选批量编辑暂未实现</div>
      </div>
    )
  }
  if (!widget) return null

  const meta = editor.registry.widgets.get(widget.type) as WidgetMeta | undefined
  const Icon = WIDGET_TYPE_ICON[widget.type] ?? ChartBar

  return (
    <>
      {/* 选中头部卡 */}
      <div
        className="flex items-center gap-2 border-b px-3 pt-2.5 pb-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded"
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
          }}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="t-sm fw-5 truncate">{widget.name}</div>
          <div className="t-xs t-3 t-mono">#{widget.id.slice(0, 8)}</div>
        </div>
        <button
          className="btn btn-ghost-icon"
          aria-label="复制"
          onClick={() =>
            editor.execute('widget.add', { type: widget.type, props: widget.props })
          }
        >
          <Copy size={14} />
        </button>
        <button
          className="btn btn-ghost-icon"
          style={{ color: 'var(--danger)' }}
          aria-label="删除"
          onClick={() => editor.removeWidgets([widget.id])}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* 位置和大小 */}
      <PropSection title="位置和大小">
        <PropRow label="X / Y">
          <NumInput
            value={Math.round(widget.layout.x)}
            prefix="X"
            onChange={(x) => editor.updateLayout(widget.id, { x })}
          />
          <NumInput
            value={Math.round(widget.layout.y)}
            prefix="Y"
            onChange={(y) => editor.updateLayout(widget.id, { y })}
          />
        </PropRow>
        <PropRow label="宽 / 高">
          <NumInput
            value={Math.round(widget.layout.width)}
            prefix="W"
            onChange={(width) => editor.updateLayout(widget.id, { width })}
          />
          <NumInput
            value={Math.round(widget.layout.height)}
            prefix="H"
            onChange={(height) => editor.updateLayout(widget.id, { height })}
          />
        </PropRow>
        <PropRow label="旋转">
          <NumInput
            value={Math.round(widget.layout.rotate)}
            suffix="°"
            onChange={(rotate) => editor.updateLayout(widget.id, { rotate })}
          />
        </PropRow>
        <PropRow label="不透明度">
          <NumInput
            value={Math.round(widget.layout.opacity * 100)}
            suffix="%"
            min={0}
            max={100}
            onChange={(p) =>
              editor.updateLayout(widget.id, {
                opacity: Math.max(0, Math.min(1, p / 100)),
              })
            }
          />
        </PropRow>
      </PropSection>

      {/* 数据 (P8 占位) */}
      <PropSection title="数据" defaultOpen={false}>
        <PropRow label="数据源">
          <div className="prop-input">
            <Database size={12} style={{ color: 'var(--text-2)' }} />
            <input defaultValue="未绑定" className="ml-1" disabled />
            <ChevronDown size={12} style={{ color: 'var(--text-3)' }} />
          </div>
        </PropRow>
        <PropRow label="提示">
          <span className="t-xs t-3">数据源管理将在 P8 上线</span>
        </PropRow>
      </PropSection>

      {/* 样式 / 配置 — driven by WidgetMeta.propsConfig */}
      {meta && <MetaDrivenSections widget={widget} meta={meta} />}
    </>
  )
}

// ─── Schema-driven sections ────────────────────────────────────────

function MetaDrivenSections({ widget, meta }: { widget: WidgetNode; meta: WidgetMeta }) {
  const grouped = React.useMemo(
    () => groupPropsByGroup(meta.propsConfig),
    [meta.propsConfig],
  )
  return (
    <>
      {Object.entries(grouped).map(([groupName, configs]) => (
        <PropSection
          key={groupName}
          title={groupName}
          defaultOpen={groupName === '样式' || groupName === '配置'}
        >
          {configs.map((cfg) => (
            <SchemaField key={cfg.path} widget={widget} cfg={cfg} />
          ))}
        </PropSection>
      ))}
    </>
  )
}

function groupPropsByGroup(configs: PropConfig[]): Record<string, PropConfig[]> {
  const out: Record<string, PropConfig[]> = {}
  for (const c of configs) {
    const g = c.group ?? '样式'
    if (!out[g]) out[g] = []
    out[g].push(c)
  }
  return out
}

function SchemaField({ widget, cfg }: { widget: WidgetNode; cfg: PropConfig }) {
  const editor = useDashboardEditor()
  const setterDef = editor.registry.setters.get(cfg.setter)
  const visible = cfg.visible ? cfg.visible(widget.props) : true
  const disabled = cfg.disabled ? cfg.disabled(widget.props) : false
  if (!visible) return null

  const value = getByPath(widget.props, cfg.path)
  const handleChange = (next: unknown) => {
    const nextProps = setByPath(widget.props, cfg.path, next)
    editor.updateProps(widget.id, nextProps)
  }

  if (!setterDef) {
    return (
      <PropRow label={cfg.label}>
        <span className="t-xs" style={{ color: 'var(--danger)' }}>
          未注册的 setter: {cfg.setter}
        </span>
      </PropRow>
    )
  }
  const SetterComp = setterDef.component

  return (
    <PropRow label={cfg.label}>
      <SetterComp
        value={value}
        onChange={handleChange}
        setterProps={cfg.setterProps}
        context={{ node: widget, editor }}
        disabled={disabled}
      />
    </PropRow>
  )
}
