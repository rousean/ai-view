import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ChartBar, ChevronRight, Database, Search } from 'lucide-react'
import { Feedback } from '@dnd-kit/dom'
import { useDraggable } from '@dnd-kit/react'
import type { WidgetMeta } from '@widgets/widget-meta'
import { Input } from '~/components/ui/input'
import { ScrollArea } from '~/components/ui/scroll-area'
import { cn } from '~/lib/utils'
import { useDashboardEditor, useDocumentState } from '../editor/editor-context'
import { addWidgetAtViewportCenter } from './add-widget-helper'

/**
 * Left material panel (240px) — variant B style: top search box + category
 * tabs + scrollable widget grid + bottom data-source indicator.
 */
export function MaterialsPanel({
  onOpenDataSources,
}: {
  /** Click-through for the footer "数据源 · N 已连接" button. EditorRoot
   *  wires this to switch the rail to the data-sources panel. */
  onOpenDataSources?: () => void
} = {}) {
  const editor = useDashboardEditor()
  const [, force] = React.useReducer((x) => x + 1, 0)
  React.useEffect(() => editor.registry.widgets.subscribe(() => force()), [editor])

  // `/` focuses the materials search input — Linear / GitHub idiom.
  // Bound to window so the binding works from anywhere in the editor
  // chrome. We skip when typing in another input so the literal slash
  // can still be entered into text fields.
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      const t = e.target as HTMLElement | null
      if (!t) return
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return
      e.preventDefault()
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
    <div className="border-border bg-card flex w-60 shrink-0 flex-col border-r">
      {/* Search */}
      <div className="relative px-2.5 pt-2.5">
        <Search
          size={13}
          className="text-muted-foreground/80 absolute top-1/2 left-5 -translate-y-px"
        />
        <Input
          ref={searchInputRef}
          placeholder="搜索物料"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-7 px-7 text-xs"
        />
        <kbd className="text-muted-foreground/60 bg-muted absolute top-1/2 right-5 inline-flex h-4 -translate-y-px items-center justify-center rounded border border-border/60 px-1 font-mono text-[10px]">
          /
        </kbd>
      </div>

      {/* Category tabs. Labels are short (2 chars), so distribute them
          evenly across the panel width (flex-1) — no overflow, no
          truncation. `overflow-x-auto` stays as a safety net if a plugin
          ever registers enough extra categories to exceed min-content.
          Tabs grey out + become inert while a search is active,
          signalling that results span all categories. */}
      <div
        className={cn(
          'border-border mt-2 flex shrink-0 items-stretch overflow-x-auto overflow-y-hidden border-b px-1.5 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]',
          isSearching && 'pointer-events-none opacity-40',
        )}
      >
        {categoryIds.map((cat) => {
          const isActive = cat === activeCat
          return (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={cn(
                'relative flex-1 cursor-pointer px-1 py-2 text-center text-xs whitespace-nowrap select-none',
                isActive
                  ? "text-foreground font-medium after:bg-primary after:absolute after:right-1.5 after:-bottom-px after:left-1.5 after:h-0.5 after:rounded-[1px] after:content-['']"
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {categoryLabel(cat)}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          <div className="text-muted-foreground/80 flex items-center gap-1.5 px-1 pt-1.5 pb-2 text-[11px] font-semibold tracking-wide uppercase">
            {isSearching
              ? `搜索结果 · ${items.length}`
              : `${categoryLabel(activeCat)} · ${items.length}`}
          </div>
          {items.length === 0 ? (
            <p className="text-muted-foreground/80 px-1 py-4 text-center text-[11px]">
              没有匹配的物料
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((meta) => (
                <MaterialCard key={meta.type} meta={meta} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer — data source indicator. Live count + jumps to the
          data-sources rail panel on click. */}
      <DataSourcesFooter onClick={onOpenDataSources} />
    </div>
  )
}

// ─── Draggable card ────────────────────────────────────────────────

const MaterialCard: React.FC<{ meta: WidgetMeta }> = ({ meta }) => {
  const id = React.useId()
  const editor = useDashboardEditor()
  const { ref } = useDraggable({
    id,
    type: 'materials',
    data: meta,
    plugins: [Feedback.configure({ feedback: 'clone', dropAnimation: null })],
  })
  const Icon = meta.icon ?? ChartBar

  // Single vs double click on a material card:
  //   - single → enter "place" mode for this widget type; the user then
  //     clicks (default size) or drags-a-box (custom size) on the canvas.
  //   - double → drop at the centre of the visible viewport (the old
  //     shortcut), shared with the command palette.
  // A short timer disambiguates the two so a double-click doesn't also
  // fire the single-click placement.
  const clickTimer = React.useRef<number | null>(null)
  React.useEffect(
    () => () => {
      if (clickTimer.current) clearTimeout(clickTimer.current)
    },
    [],
  )
  const handleClick = () => {
    if (clickTimer.current) return
    clickTimer.current = window.setTimeout(() => {
      clickTimer.current = null
      editor.setTool('place', { widgetType: meta.type })
    }, 200)
  }
  const handleDoubleClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current)
      clickTimer.current = null
    }
    addWidgetAtViewportCenter(editor, meta)
  }

  // Prefer the widget's curated SVG preview when it ships one; fall
  // back to the icon for widgets that haven't authored a thumbnail
  // yet. The thumbnail surface keeps `aspect-[1.4/1]` regardless so
  // the grid layout stays uniform.
  const Preview = meta.Preview
  return (
    <div
      ref={ref}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={`${meta.description ?? meta.title}\n单击后在画布拖拽放置 · 双击居中添加`}
      className="hover:bg-muted flex cursor-grab flex-col items-center gap-1 rounded-sm px-1 py-2 transition-colors select-none active:cursor-grabbing"
    >
      <div className="bg-muted border-border/60 text-muted-foreground flex aspect-[1.4/1] w-full items-center justify-center rounded-sm border p-1.5">
        {Preview ? <Preview /> : <Icon size={28} />}
      </div>
      <div className="text-muted-foreground text-center text-[11px] leading-tight">
        {meta.title}
      </div>
    </div>
  )
}

// ─── Footer: data-source quick link ────────────────────────────────

/**
 * Footer row showing how many data sources the project has connected
 * + a click-through to the data-sources rail panel. Reads the count
 * live from the document store so it stays in sync as the user
 * adds / deletes sources elsewhere.
 */
function DataSourcesFooter({ onClick }: { onClick?: () => void }) {
  const count = useDocumentState(
    useShallow((s) => s.project?.dataSources?.length ?? 0),
  )
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="border-border text-muted-foreground hover:bg-muted flex cursor-pointer items-center gap-1.5 border-t px-2.5 py-2 text-left text-xs transition-colors disabled:cursor-default disabled:opacity-60"
    >
      <Database size={14} />
      <span className="flex-1">数据源</span>
      <span className="text-muted-foreground/60 text-[11px]">
        {count > 0 ? `${count} 个已连接` : '尚未配置'}
      </span>
      <ChevronRight size={12} />
    </button>
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
