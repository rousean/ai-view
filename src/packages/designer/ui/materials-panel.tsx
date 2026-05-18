import * as React from 'react'
import { ChartBar, ChevronRight, Database, Search } from 'lucide-react'
import { Feedback } from '@dnd-kit/dom'
import { useDraggable } from '@dnd-kit/react'
import type { WidgetMeta } from '@widgets/widget-meta'
import { ScrollArea } from '~/components/ui/scroll-area'
import { useDashboardEditor } from '../editor/editor-context'

/**
 * Left material panel (240px) — variant B style: top search box + category
 * tabs + scrollable widget grid + bottom data-source indicator.
 */
export function MaterialsPanel() {
  const editor = useDashboardEditor()
  const [, force] = React.useReducer((x) => x + 1, 0)
  React.useEffect(() => editor.registry.widgets.subscribe(() => force()), [editor])

  const all = editor.registry.widgets.list() as unknown as WidgetMeta[]
  const [query, setQuery] = React.useState('')

  const grouped = React.useMemo(() => groupByCategory(all), [all])
  const categoryIds = React.useMemo(() => Object.keys(grouped), [grouped])
  const [activeCat, setActiveCat] = React.useState<string>(categoryIds[0] ?? 'chart')

  // If the active category no longer exists (widget plugin unloaded), pick the first.
  React.useEffect(() => {
    if (categoryIds.length && !categoryIds.includes(activeCat)) {
      setActiveCat(categoryIds[0])
    }
  }, [categoryIds, activeCat])

  // No query → restrict to the active category.
  // Query present → search across ALL categories (the user's intent is
  // "find me a widget", not "find me a widget in this tab").
  const q = query.trim().toLowerCase()
  const isSearching = q.length > 0
  const items: WidgetMeta[] = React.useMemo(() => {
    if (!isSearching) return grouped[activeCat] ?? []
    return all.filter((m) => {
      if (m.title.toLowerCase().includes(q)) return true
      if (m.description?.toLowerCase().includes(q)) return true
      if (m.tags?.some((t) => t.toLowerCase().includes(q))) return true
      if (m.type.toLowerCase().includes(q)) return true
      return false
    })
  }, [all, grouped, activeCat, isSearching, q])

  return (
    <div
      style={{
        width: 'var(--panel-w-left)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--panel-bg)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Search */}
      <div style={{ padding: '10px 10px 0' }}>
        <div className="prop-input" style={{ height: 28, padding: '0 8px' }}>
          <Search size={13} style={{ color: 'var(--text-3)', marginRight: 6 }} />
          <input
            placeholder="搜索物料"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="t-4 t-xs">⌘K</span>
        </div>
      </div>

      {/* Category tabs (horizontal scroll) */}
      <div
        className="tabs scroll-y"
        style={{
          marginTop: 8,
          padding: '0 6px',
          flexShrink: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          // Category tabs become inert / muted while a search is active to
          // signal that the displayed results span ALL categories.
          opacity: isSearching ? 0.4 : 1,
          pointerEvents: isSearching ? 'none' : 'auto',
        }}
      >
        {categoryIds.map((cat) => (
          <button
            key={cat}
            className={'tab ' + (cat === activeCat ? 'active' : '')}
            onClick={() => setActiveCat(cat)}
          >
            {categoryLabel(cat)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <ScrollArea className="flex-1 min-h-0">
        <div style={{ padding: 8 }}>
          <div className="section-label" style={{ padding: '6px 4px 8px' }}>
            {isSearching
              ? `搜索结果 · ${items.length}`
              : `${categoryLabel(activeCat)} · ${items.length}`}
          </div>
          {items.length === 0 ? (
            <p className="t-3 t-xs" style={{ padding: '16px 4px', textAlign: 'center' }}>
              没有匹配的物料
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {items.map((meta) => (
                <MaterialCard key={meta.type} meta={meta} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer — data source indicator (placeholder for P8) */}
      <button
        style={{
          borderTop: '1px solid var(--border)',
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--text-2)',
          fontSize: 12,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <Database size={14} />
        <span style={{ flex: 1 }}>数据源</span>
        <span className="t-4 t-xs">0 个已连接</span>
        <ChevronRight size={12} />
      </button>
    </div>
  )
}

// ─── Draggable card ────────────────────────────────────────────────

const MaterialCard: React.FC<{ meta: WidgetMeta }> = ({ meta }) => {
  const id = React.useId()
  const { ref } = useDraggable({
    id,
    type: 'materials',
    data: meta,
    plugins: [Feedback.configure({ feedback: 'clone', dropAnimation: null })],
  })
  const Icon = meta.icon ?? ChartBar
  return (
    <div ref={ref} className="mat-item" title={meta.description ?? meta.title}>
      <div className="mat-thumb">
        <Icon size={28} stroke="var(--text-2)" />
      </div>
      <div className="mat-label">{meta.title}</div>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────

function groupByCategory(items: WidgetMeta[]): Record<string, WidgetMeta[]> {
  const out: Record<string, WidgetMeta[]> = {}
  for (const m of items) {
    const c = m.category ?? 'other'
    if (!out[c]) out[c] = []
    out[c].push(m)
  }
  return out
}

function categoryLabel(c: string): string {
  return (
    {
      chart: '图表',
      media: '媒体',
      text: '文字',
      decoration: '装饰',
      container: '容器',
      indicator: '指标',
      advanced: '高级',
      basic: '基础',
      other: '其他',
    }[c] ?? c
  )
}
