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
import { ScrollArea } from '~/components/ui/scroll-area'
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
    <div
      style={{
        width: 'var(--panel-w-left)',
        flexShrink: 0,
        background: 'var(--panel-bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          height: 36,
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          gap: 8,
        }}
      >
        <span className="t-md fw-5">{title}</span>
        <div style={{ flex: 1 }} />
        {action ?? (
          <button className="btn btn-ghost-icon" aria-label="新增">
            <Plus size={14} />
          </button>
        )}
      </div>
      <ScrollArea className="flex-1 min-h-0">{children}</ScrollArea>
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
    <div style={{ padding: '4px 0' }}>
      {ordered.length === 0 && (
        <p className="t-3 t-xs" style={{ padding: 16, textAlign: 'center' }}>
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
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              fontSize: 12,
              background: isSel ? 'var(--accent-soft)' : 'transparent',
              color: isSel ? 'var(--accent)' : 'var(--text-1)',
              cursor: 'pointer',
            }}
          >
            <button
              className="btn btn-ghost-icon"
              style={{ width: 16, height: 16, color: 'var(--text-3)' }}
              onClick={(e) => {
                e.stopPropagation()
                editor.setHidden([w.id], !w.flags.hidden)
              }}
              aria-label={w.flags.hidden ? '显示' : '隐藏'}
            >
              {w.flags.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
            <Icon size={13} />
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {w.name}
            </span>
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
    <div style={{ padding: 8 }}>
      {DEMO_DATA_SOURCES.map(([n, t, c]) => (
        <div
          key={n}
          className="mat-item"
          style={{
            flexDirection: 'row',
            padding: '8px 10px',
            alignItems: 'center',
          }}
        >
          <Database size={16} stroke="var(--text-2)" />
          <div style={{ flex: 1, marginLeft: 8 }}>
            <div className="t-sm fw-5">{n}</div>
            <div className="t-xs t-3">{t}</div>
          </div>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: c,
            }}
          />
        </div>
      ))}
      <button
        className="btn"
        style={{
          width: '100%',
          marginTop: 8,
          justifyContent: 'flex-start',
          color: 'var(--accent)',
        }}
      >
        <Plus size={14} /> 添加数据源
      </button>
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
    <div style={{ padding: 8 }}>
      <div className="section-label" style={{ padding: '6px 4px 8px' }}>
        背景图
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="mat-item" style={{ padding: 4 }}>
            <div
              className="mat-thumb"
              style={{
                background:
                  i === 0
                    ? 'linear-gradient(180deg, #0a1929, #0d1e36)'
                    : i === 1
                      ? 'linear-gradient(135deg, #1a0d2e, #0a1929)'
                      : i === 2
                        ? 'linear-gradient(180deg, #0d1e36, #00d4ff20)'
                        : 'linear-gradient(180deg, #0a1929, #7c5cff20)',
                border: 'none',
              }}
            />
          </div>
        ))}
      </div>
      <div className="section-label">主题色板</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 6,
          padding: '0 4px 8px',
        }}
      >
        {DEMO_PALETTES.map((c) => (
          <div
            key={c}
            style={{
              aspectRatio: '1',
              borderRadius: 4,
              background: c,
              boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
              cursor: 'pointer',
            }}
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
    <div style={{ padding: '4px 0' }}>
      {DEMO_HISTORY.map(([t, u, m, cur], i) => (
        <div
          key={i}
          style={{
            padding: '8px 12px',
            display: 'flex',
            gap: 8,
            borderLeft: cur ? '2px solid var(--accent)' : '2px solid transparent',
            background: cur ? 'var(--accent-soft)' : 'transparent',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: cur ? 'var(--accent)' : 'var(--text-4)',
              marginTop: 6,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div className="t-sm">{m}</div>
            <div className="t-xs t-3">
              {u} · {t}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
