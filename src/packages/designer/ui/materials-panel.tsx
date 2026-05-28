import * as React from 'react'
import { ChartBar, ChevronRight, Database, Search } from 'lucide-react'
import { Feedback } from '@dnd-kit/dom'
import { useDraggable } from '@dnd-kit/react'
import type { WidgetMeta } from '@widgets/widget-meta'
import { Input } from '~/components/ui/input'
import { ScrollArea } from '~/components/ui/scroll-area'
import { cn } from '~/lib/utils'
import { useDashboardEditor } from '../editor/editor-context'

/**
 * Left material panel (240px) — variant B style: top search box + category
 * tabs + scrollable widget grid + bottom data-source indicator.
 */
export function MaterialsPanel() {
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

      {/* Category tabs (horizontal scroll). Tabs grey out + become inert
          while a search is active, signalling that results span all categories. */}
      <div
        className={cn(
          'border-border mt-2 flex shrink-0 items-stretch gap-0.5 overflow-x-auto overflow-y-hidden border-b px-2.5 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]',
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
                'relative flex-shrink-0 cursor-pointer px-2 py-2 text-xs whitespace-nowrap select-none',
                isActive
                  ? "text-foreground font-medium after:bg-primary after:absolute after:right-2 after:-bottom-px after:left-2 after:h-0.5 after:rounded-[1px] after:content-['']"
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

      {/* Footer — data source indicator (placeholder for P8) */}
      <button className="border-border text-muted-foreground hover:bg-muted flex cursor-pointer items-center gap-1.5 border-t px-2.5 py-2 text-left text-xs transition-colors">
        <Database size={14} />
        <span className="flex-1">数据源</span>
        <span className="text-muted-foreground/60 text-[11px]">0 个已连接</span>
        <ChevronRight size={12} />
      </button>
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

  // Double-click shortcut — drop the widget at the centre of the
  // current viewport. Matches Figma's library shortcut.
  const handleDoubleClick = () => {
    const page = editor.getCurrentPage()
    if (!page) return
    const size = meta.defaultLayout
    let x = (page.canvas.width - size.width) / 2
    let y = (page.canvas.height - size.height) / 2
    if (typeof window !== 'undefined') {
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const pt = editor.screenToCanvas({ x: cx, y: cy }, { left: 0, top: 0 })
      x = Math.max(0, Math.min(page.canvas.width - size.width, pt.x - size.width / 2))
      y = Math.max(0, Math.min(page.canvas.height - size.height, pt.y - size.height / 2))
    }
    editor.addWidget(meta.type, {
      position: { x, y },
      size,
      props: meta.defaultProps as Record<string, unknown>,
    })
  }

  // Prefer the widget's curated SVG preview when it ships one; fall
  // back to the icon for widgets that haven't authored a thumbnail
  // yet. The thumbnail surface keeps `aspect-[1.4/1]` regardless so
  // the grid layout stays uniform.
  const Preview = meta.Preview
  return (
    <div
      ref={ref}
      onDoubleClick={handleDoubleClick}
      title={`${meta.description ?? meta.title}\n双击添加到画布`}
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
