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
      className="flex w-[var(--panel-w-left)] shrink-0 flex-col border-r"
      style={{
        background: 'var(--panel-bg)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Search */}
      <div className="px-2.5 pt-2.5">
        <div className="prop-input h-7 px-2">
          <Search
            size={13}
            className="mr-1.5"
            style={{ color: 'var(--text-3)' }}
          />
          <input
            placeholder="搜索物料"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="t-4 t-xs">⌘K</span>
        </div>
      </div>

      {/* Category tabs (horizontal scroll). Tabs grey out + become inert
          while a search is active, signalling that results span all categories. */}
      <div
        className={
          'tabs scroll-y mt-2 shrink-0 overflow-x-auto overflow-y-hidden px-1.5 ' +
          (isSearching ? 'pointer-events-none opacity-40' : '')
        }
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
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          <div className="section-label px-1 pt-1.5 pb-2">
            {isSearching
              ? `搜索结果 · ${items.length}`
              : `${categoryLabel(activeCat)} · ${items.length}`}
          </div>
          {items.length === 0 ? (
            <p className="t-3 t-xs px-1 py-4 text-center">没有匹配的物料</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((meta) => (
                <MaterialCard key={meta.type} meta={meta} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer — data source indicator (placeholder for P8) */}
      <button
        className="flex cursor-pointer items-center gap-1.5 border-0 border-t px-2.5 py-2 text-left text-xs"
        style={{
          borderTopColor: 'var(--border)',
          color: 'var(--text-2)',
          background: 'transparent',
        }}
      >
        <Database size={14} />
        <span className="flex-1">数据源</span>
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
