import * as React from 'react'
import {
  ChartBar,
  ChartLine,
  ChartPie,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Database,
  Eye,
  EyeOff,
  Folder,
  Hash,
  Lock,
  Plus,
  Radar,
  Search,
  Table,
  Type as TextIcon,
  Unlock,
} from 'lucide-react'
import { Input } from '~/components/ui/input'
import type { WidgetNode } from '@schema/types'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '~/components/ui/button'
import { ScrollArea } from '~/components/ui/scroll-area'
import { cn } from '~/lib/utils'
import { useDocumentStore } from '../stores/document-store'
import { useEditorStore } from '../stores/editor-store'
import { selectWidgets } from '../stores/selectors'
import { useDashboardEditor } from '../editor/editor-context'

interface SecondaryPanelProps {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}

/**
 * Wrapper for the 240px secondary panel that flies out next to the icon rail
 * (variant B). Title bar + scrollable body.
 */
export function SecondaryPanel({ title, action, children }: SecondaryPanelProps) {
  return (
    <div className="border-border bg-card flex w-60 shrink-0 flex-col border-r">
      <div className="border-border flex h-9 items-center gap-2 border-b px-3">
        <span className="text-[13px] font-medium">{title}</span>
        <div className="flex-1" />
        {action ?? (
          <Button variant="ghost" size="icon-sm" aria-label="新增">
            <Plus size={14} />
          </Button>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">{children}</ScrollArea>
    </div>
  )
}

// ───────── Layers ──────────────────────────────────────────────────

const TYPE_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  'bar-chart': ChartBar,
  'line-chart': ChartLine,
  'pie-chart': ChartPie,
  'donut-chart': ChartPie,
  'radar-chart': Radar,
  text: TextIcon,
  number: Hash,
  table: Table,
  group: Folder,
}

/**
 * Walk the page's widget list top-down (z-order high → low, Photoshop /
 * Figma convention). Widgets sharing a `groupId` collapse into a single
 * "group" item whose first encountered member decides the position; the
 * other members are nested inside that group's `members` array.
 */
interface FlatItem {
  kind: 'widget'
  widget: WidgetNode
}
interface GroupItem {
  kind: 'group'
  groupId: string
  members: WidgetNode[]
}
type LayerItem = FlatItem | GroupItem

function buildLayerItems(widgets: WidgetNode[]): LayerItem[] {
  // First pass: collect members per groupId in top-down order.
  const groupMembers = new Map<string, WidgetNode[]>()
  for (const w of widgets) {
    if (!w.groupId) continue
    let arr = groupMembers.get(w.groupId)
    if (!arr) {
      arr = []
      groupMembers.set(w.groupId, arr)
    }
    arr.push(w)
  }
  // Second pass: walk top-down, emit each group at its first member's
  // position, skip subsequent members.
  const emittedGroups = new Set<string>()
  const items: LayerItem[] = []
  for (const w of widgets) {
    if (w.groupId) {
      if (emittedGroups.has(w.groupId)) continue
      emittedGroups.add(w.groupId)
      items.push({
        kind: 'group',
        groupId: w.groupId,
        members: groupMembers.get(w.groupId) ?? [],
      })
    } else {
      items.push({ kind: 'widget', widget: w })
    }
  }
  return items
}

/** Drag identifier used in dataTransfer for layer reordering. */
const DRAG_MIME = 'application/x-aiview-layer'

/**
 * Full-panel layer browser. Renders the SecondaryPanel chrome itself
 * (title bar + scrolling body) instead of being wrapped by `<SecondaryPanel>`
 * — the search toolbar needs to stay sticky above the scrolling list,
 * and that's easier when this component owns the whole flex column.
 */
export function LayersPanel() {
  const editor = useDashboardEditor()
  const widgets = useDocumentStore(useShallow((s) => selectWidgets(s)))
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds])
  // Top of stack first (matches Photoshop / Figma convention).
  const ordered = React.useMemo(() => [...widgets].reverse(), [widgets])
  const items = React.useMemo(() => buildLayerItems(ordered), [ordered])

  // Per-group collapsed state. Sticky for the session — no need to persist.
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({})
  const toggleCollapsed = (gid: string) =>
    setCollapsed((m) => ({ ...m, [gid]: !m[gid] }))

  // Search: case-insensitive substring against widget.name. A group is
  // shown when itself OR any member matches; members hidden if neither.
  const [query, setQuery] = React.useState('')
  const q = query.trim().toLowerCase()
  const matches = React.useCallback(
    (w: WidgetNode) => !q || w.name.toLowerCase().includes(q),
    [q],
  )
  const filteredItems = React.useMemo(() => {
    if (!q) return items
    const out: LayerItem[] = []
    for (const it of items) {
      if (it.kind === 'widget') {
        if (matches(it.widget)) out.push(it)
      } else {
        const hits = it.members.filter(matches)
        if (hits.length > 0) {
          // Auto-expand groups whose members matched, even if user had
          // collapsed them — search wins over the saved state.
          out.push({ kind: 'group', groupId: it.groupId, members: hits })
        }
      }
    }
    return out
  }, [items, q, matches])

  const groupIds = React.useMemo(
    () => items.flatMap((it) => (it.kind === 'group' ? [it.groupId] : [])),
    [items],
  )

  const collapseAll = () => {
    const next: Record<string, boolean> = {}
    for (const id of groupIds) next[id] = true
    setCollapsed(next)
  }
  const expandAll = () => setCollapsed({})

  // ── Drag-reorder ────────────────────────────────────────────────
  // We drag top-level LayerItems (a widget or a whole group) by their
  // primary id (widget.id or groupId). On drop, compute the new
  // top-level ordering, flatten back to a widget-id list, reverse to
  // bottom-up z-order, and ship as a single page.reorder command.
  const itemId = (it: LayerItem) => (it.kind === 'widget' ? it.widget.id : it.groupId)
  const [dragOverId, setDragOverId] = React.useState<string | null>(null)
  const onReorder = (srcKey: string, targetKey: string) => {
    if (srcKey === targetKey) return
    const srcIdx = items.findIndex((it) => itemId(it) === srcKey)
    const targetIdx = items.findIndex((it) => itemId(it) === targetKey)
    if (srcIdx < 0 || targetIdx < 0) return
    const next = [...items]
    const [moved] = next.splice(srcIdx, 1)
    next.splice(targetIdx, 0, moved!)
    // top-down (visual) → bottom-up (z-order) for the schema.
    const orderedIds = next
      .flatMap((it) => (it.kind === 'widget' ? [it.widget.id] : it.members.map((m) => m.id)))
      .reverse()
    editor.reorderWidgets(orderedIds)
  }

  return (
    <div className="border-border bg-card flex w-60 shrink-0 flex-col border-r">
      {/* Title bar (matches SecondaryPanel) */}
      <div className="border-border flex h-9 items-center gap-2 border-b px-3">
        <span className="text-[13px] font-medium">图层</span>
      </div>
      {/* Toolbar — search + collapse/expand all */}
      <div className="border-border flex items-center gap-1 border-b px-2 py-1.5">
        <div className="relative flex-1">
          <Search className="text-muted-foreground/80 pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索图层…"
            className="h-7 pr-2 pl-6 text-xs"
          />
        </div>
        <button
          onClick={collapseAll}
          disabled={groupIds.length === 0}
          className="text-muted-foreground/80 hover:bg-muted hover:text-foreground flex h-7 w-7 items-center justify-center rounded-sm disabled:opacity-30"
          title="全部折叠"
          aria-label="全部折叠"
        >
          <ChevronsUp size={13} />
        </button>
        <button
          onClick={expandAll}
          disabled={groupIds.length === 0}
          className="text-muted-foreground/80 hover:bg-muted hover:text-foreground flex h-7 w-7 items-center justify-center rounded-sm disabled:opacity-30"
          title="全部展开"
          aria-label="全部展开"
        >
          <ChevronsDown size={13} />
        </button>
      </div>

      {/* Body */}
      {ordered.length === 0 ? (
        <p className="text-muted-foreground/80 p-4 text-center text-[11px]">
          画布上还没有任何组件
        </p>
      ) : filteredItems.length === 0 ? (
        <p className="text-muted-foreground/80 p-4 text-center text-[11px]">
          没有匹配的图层
        </p>
      ) : (
        <div className="flex-1 overflow-y-auto py-1">
          {filteredItems.map((it) => {
            const id = itemId(it)
            const dndProps = {
              draggable: true,
              onDragStart: (e: React.DragEvent) => {
                e.dataTransfer.setData(DRAG_MIME, id)
                e.dataTransfer.effectAllowed = 'move'
              },
              onDragOver: (e: React.DragEvent) => {
                if (!e.dataTransfer.types.includes(DRAG_MIME)) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverId(id)
              },
              onDragLeave: () => setDragOverId((cur) => (cur === id ? null : cur)),
              onDrop: (e: React.DragEvent) => {
                const src = e.dataTransfer.getData(DRAG_MIME)
                setDragOverId(null)
                if (src) onReorder(src, id)
              },
              onDragEnd: () => setDragOverId(null),
              'data-drop-target': dragOverId === id || undefined,
            }
            if (it.kind === 'widget') {
              return (
                <WidgetRow
                  key={it.widget.id}
                  widget={it.widget}
                  selected={selectedSet.has(it.widget.id)}
                  indent={0}
                  onSelect={(e) =>
                    e.shiftKey || e.ctrlKey || e.metaKey
                      ? editor.toggleSelect(it.widget.id)
                      : editor.selectOne(it.widget.id)
                  }
                  onToggleHidden={() =>
                    editor.setHidden([it.widget.id], !it.widget.flags.hidden)
                  }
                  onToggleLocked={() =>
                    editor.setLocked([it.widget.id], !it.widget.flags.locked)
                  }
                  dndProps={dndProps}
                />
              )
            }
            return (
              <GroupRow
                key={it.groupId}
                group={it}
                selectedSet={selectedSet}
                collapsed={!!collapsed[it.groupId] && !q /* search overrides collapse */}
                onToggleCollapsed={() => toggleCollapsed(it.groupId)}
                dndProps={dndProps}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Group + widget rows ────────────────────────────────────────────

function GroupRow({
  group,
  selectedSet,
  collapsed,
  onToggleCollapsed,
  dndProps,
}: {
  group: GroupItem
  selectedSet: Set<string>
  collapsed: boolean
  onToggleCollapsed: () => void
  dndProps?: React.HTMLAttributes<HTMLDivElement> & {
    draggable?: boolean
    'data-drop-target'?: boolean
  }
}) {
  const editor = useDashboardEditor()
  const memberIds = group.members.map((w) => w.id)
  // Group is "selected" iff every member is in the selection — matches
  // how clicking a group member expands selection to the full group.
  const allSelected = memberIds.every((id) => selectedSet.has(id))
  const allHidden = group.members.every((w) => w.flags.hidden)
  const allLocked = group.members.every((w) => w.flags.locked)

  const selectGroup = (additive: boolean) => {
    if (additive) {
      const next = new Set(editor.getSelectedIds())
      for (const id of memberIds) next.add(id)
      editor.select([...next])
    } else {
      editor.select(memberIds)
    }
  }

  return (
    <>
      <div
        {...dndProps}
        onClick={(e) => selectGroup(e.shiftKey || e.ctrlKey || e.metaKey)}
        className={cn(
          'flex cursor-pointer items-center gap-1.5 px-3 py-[5px] text-xs',
          allSelected ? 'bg-primary/10 text-primary' : 'text-foreground',
          dndProps?.['data-drop-target'] && 'ring-primary ring-2 ring-inset',
        )}
      >
        <button
          className="text-muted-foreground/80 hover:text-foreground flex h-4 w-4 cursor-pointer items-center justify-center"
          onClick={(e) => {
            e.stopPropagation()
            onToggleCollapsed()
          }}
          aria-label={collapsed ? '展开组' : '折叠组'}
        >
          {collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
        </button>
        <button
          className="text-muted-foreground/80 hover:text-foreground flex h-4 w-4 cursor-pointer items-center justify-center"
          onClick={(e) => {
            e.stopPropagation()
            editor.setHidden(memberIds, !allHidden)
          }}
          aria-label={allHidden ? '显示组' : '隐藏组'}
        >
          {allHidden ? <EyeOff size={11} /> : <Eye size={11} />}
        </button>
        <Folder size={13} />
        <span className="flex-1 truncate">组 · {group.members.length} 个部件</span>
        <button
          className="text-muted-foreground/60 hover:text-foreground flex h-4 w-4 cursor-pointer items-center justify-center"
          onClick={(e) => {
            e.stopPropagation()
            editor.setLocked(memberIds, !allLocked)
          }}
          aria-label={allLocked ? '解锁组' : '锁定组'}
        >
          {allLocked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>
      </div>
      {!collapsed &&
        group.members.map((w) => (
          <WidgetRow
            key={w.id}
            widget={w}
            selected={selectedSet.has(w.id)}
            indent={1}
            onSelect={(e) => {
              // Clicking a member inside the layers panel selects the
              // *whole* group — same idiom as the canvas-tool path, so
              // there's never a "phantom" partial selection that the
              // user can't see in the chrome.
              if (e.shiftKey || e.ctrlKey || e.metaKey) {
                selectGroup(true)
              } else {
                selectGroup(false)
              }
            }}
            onToggleHidden={() => editor.setHidden([w.id], !w.flags.hidden)}
            onToggleLocked={() => editor.setLocked([w.id], !w.flags.locked)}
          />
        ))}
    </>
  )
}

function WidgetRow({
  widget: w,
  selected,
  indent,
  onSelect,
  onToggleHidden,
  onToggleLocked,
  dndProps,
}: {
  widget: WidgetNode
  selected: boolean
  indent: number
  onSelect: (e: React.MouseEvent) => void
  onToggleHidden: () => void
  onToggleLocked: () => void
  dndProps?: React.HTMLAttributes<HTMLDivElement> & {
    draggable?: boolean
    'data-drop-target'?: boolean
  }
}) {
  const editor = useDashboardEditor()
  const Icon = TYPE_ICON[w.type] ?? ChartBar
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(w.name)
  React.useEffect(() => setDraft(w.name), [w.name])

  const commitRename = () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== w.name) editor.renameWidget(w.id, trimmed)
  }

  return (
    <div
      {...dndProps}
      onClick={editing ? undefined : onSelect}
      className={cn(
        'group/row flex cursor-pointer items-center gap-1.5 px-3 py-[5px] text-xs',
        selected ? 'bg-primary/10 text-primary' : 'text-foreground',
        dndProps?.['data-drop-target'] && 'ring-primary ring-2 ring-inset',
      )}
      style={{ paddingLeft: 12 + indent * 16 }}
    >
      <button
        className="text-muted-foreground/80 hover:text-foreground flex h-4 w-4 cursor-pointer items-center justify-center"
        onClick={(e) => {
          e.stopPropagation()
          onToggleHidden()
        }}
        aria-label={w.flags.hidden ? '显示' : '隐藏'}
      >
        {w.flags.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
      </button>
      <Icon size={13} />
      {editing ? (
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={commitRename}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter') commitRename()
            else if (e.key === 'Escape') {
              setDraft(w.name)
              setEditing(false)
            }
          }}
          onFocus={(e) => e.target.select()}
          className="bg-background border-border min-w-0 flex-1 rounded-sm border px-1 py-0 text-xs outline-none"
        />
      ) : (
        <span
          className="flex-1 truncate"
          onDoubleClick={(e) => {
            e.stopPropagation()
            setEditing(true)
          }}
        >
          {w.name}
        </span>
      )}
      {/* Lock icon shows on hover (or when active) — matches Figma's
          row chrome. */}
      <button
        className={cn(
          'text-muted-foreground/60 hover:text-foreground flex h-4 w-4 cursor-pointer items-center justify-center transition-opacity',
          w.flags.locked ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100',
        )}
        onClick={(e) => {
          e.stopPropagation()
          onToggleLocked()
        }}
        aria-label={w.flags.locked ? '解锁' : '锁定'}
      >
        {w.flags.locked ? <Lock size={11} /> : <Unlock size={11} />}
      </button>
    </div>
  )
}

// ───────── Data sources (placeholder) ───────────────────────────────

const DEMO_DATA_SOURCES: [string, string, string][] = [
  ['销售总表', 'MySQL · 实时', '#14ae5c'],
  ['用户行为', 'Kafka · 实时流', '#14ae5c'],
  ['商品维度', 'HTTP API', '#fbbf24'],
  ['渠道来源', '静态 CSV', '#8a8a8a'],
]

export function DataSourcesPanel() {
  return (
    <div className="p-2">
      {DEMO_DATA_SOURCES.map(([n, t, c]) => (
        <div
          key={n}
          className="hover:bg-muted flex cursor-grab flex-row items-center rounded-sm px-2.5 py-2 transition-colors select-none active:cursor-grabbing"
        >
          <Database size={16} className="text-muted-foreground" />
          <div className="ml-2 flex-1">
            <div className="text-xs font-medium">{n}</div>
            <div className="text-muted-foreground/80 text-[11px]">{t}</div>
          </div>
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
        </div>
      ))}
      <Button variant="ghost" size="sm" className="text-primary mt-2 w-full justify-start">
        <Plus size={14} /> 添加数据源
      </Button>
    </div>
  )
}

// ───────── Assets (placeholder) ────────────────────────────────────

const DEMO_PALETTES = [
  '#0a1929',
  '#0d99ff',
  '#00d4ff',
  '#7c5cff',
  '#ff5edd',
  '#fbbf24',
  '#14ae5c',
  '#f24822',
  '#525252',
]

export function AssetsPanel() {
  return (
    <div className="p-2">
      <div className="text-muted-foreground/80 flex items-center gap-1.5 px-1 pt-2.5 pb-2 text-[11px] font-semibold tracking-wide uppercase">
        背景图
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="hover:bg-muted flex cursor-grab flex-col items-center gap-1 rounded-sm p-1 transition-colors select-none active:cursor-grabbing"
          >
            <div
              className="aspect-[1.4/1] w-full rounded-sm"
              style={{
                background:
                  i === 0
                    ? 'linear-gradient(180deg, #0a1929, #0d1e36)'
                    : i === 1
                      ? 'linear-gradient(135deg, #1a0d2e, #0a1929)'
                      : i === 2
                        ? 'linear-gradient(180deg, #0d1e36, #00d4ff20)'
                        : 'linear-gradient(180deg, #0a1929, #7c5cff20)',
              }}
            />
          </div>
        ))}
      </div>
      <div className="text-muted-foreground/80 flex items-center gap-1.5 px-1 pt-2.5 pb-2 text-[11px] font-semibold tracking-wide uppercase">
        主题色板
      </div>
      <div className="grid grid-cols-5 gap-1.5 px-1 pb-2">
        {DEMO_PALETTES.map((c) => (
          <div
            key={c}
            className="aspect-square cursor-pointer rounded ring-1 ring-black/10"
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  )
}

// ───────── History (placeholder) ───────────────────────────────────

const DEMO_HISTORY: [string, string, string, boolean?][] = [
  ['现在', '你', '添加图表 · 雷达图', true],
  ['3 分钟前', '你', '修改 KPI 颜色'],
  ['12 分钟前', '李小慧', '调整布局'],
  ['1 小时前', '你', '替换数据源'],
  ['昨天 16:42', '王志远', '创建项目'],
]

export function HistoryPanel() {
  return (
    <div className="py-1">
      {DEMO_HISTORY.map(([t, u, m, cur], i) => (
        <div
          key={i}
          className={cn(
            'flex cursor-pointer gap-2 border-l-2 px-3 py-2',
            cur ? 'border-primary bg-primary/10' : 'border-transparent',
          )}
        >
          <div
            className={cn(
              'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
              cur ? 'bg-primary' : 'bg-muted-foreground/40',
            )}
          />
          <div className="flex-1">
            <div className="text-xs">{m}</div>
            <div className="text-muted-foreground/80 text-[11px]">
              {u} · {t}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
