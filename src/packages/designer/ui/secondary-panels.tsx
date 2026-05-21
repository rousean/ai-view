import * as React from 'react'
import {
  ChartBar,
  ChartLine,
  ChartPie,
  Database,
  Eye,
  EyeOff,
  Folder,
  Hash,
  Plus,
  Radar,
  Table,
  Type as TextIcon,
} from 'lucide-react'
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

export function LayersPanel() {
  const editor = useDashboardEditor()
  const widgets = useDocumentStore(useShallow((s) => selectWidgets(s)))
  const selectedIds = useEditorStore((s) => s.selectedIds)
  // Render TOP first: array is bottom→top z-order, but layers panel
  // shows top→bottom (Photoshop / Figma convention).
  const ordered = [...widgets].reverse()

  return (
    <div className="py-1">
      {ordered.length === 0 && (
        <p className="text-muted-foreground/80 p-4 text-center text-[11px]">
          画布上还没有任何组件
        </p>
      )}
      {ordered.map((w) => {
        const isSel = selectedIds.includes(w.id)
        const Icon = TYPE_ICON[w.type] ?? ChartBar
        return (
          <div
            key={w.id}
            onClick={(e) =>
              e.shiftKey || e.ctrlKey || e.metaKey
                ? editor.toggleSelect(w.id)
                : editor.selectOne(w.id)
            }
            className={cn(
              'flex cursor-pointer items-center gap-1.5 px-3 py-[5px] text-xs',
              isSel ? 'bg-primary/10 text-primary' : 'text-foreground',
            )}
          >
            <button
              className="text-muted-foreground/80 hover:text-foreground flex h-4 w-4 cursor-pointer items-center justify-center"
              onClick={(e) => {
                e.stopPropagation()
                editor.setHidden([w.id], !w.flags.hidden)
              }}
              aria-label={w.flags.hidden ? '显示' : '隐藏'}
            >
              {w.flags.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
            <Icon size={13} />
            <span className="flex-1 truncate">{w.name}</span>
          </div>
        )
      })}
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
