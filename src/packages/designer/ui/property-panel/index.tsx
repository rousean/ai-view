import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ChartBar, Database, MousePointerClick, PaintRoller, PlayCircle } from 'lucide-react'
import type { WidgetMeta } from '@widgets/widget-meta'
import { ScrollArea } from '~/components/ui/scroll-area'
import { cn } from '~/lib/utils'
import { DataTab } from '../data-tab/data-tab'
import { useDashboardEditor, useDocumentState, useEditorState } from '../../editor/editor-context'
import { selectCurrentPage, selectWidget } from '../../stores/selectors'
import { AiBeautifyDialog } from './ai-beautify-dialog'
import { AnimationsTab } from './animations-tab'
import { CanvasProps } from './canvas-tab'
import { DesignTab } from './design-tab'
import { InteractionsTab } from './interactions-tab'
import { PaletteEditor } from './palette-editor'
import { PanelToolbar } from './panel-toolbar'
import { WidgetHeader } from './widget-header'

/**
 * Active tab in the redesigned right panel.
 *
 *   - `canvas`   — page-level config; only used when nothing is selected
 *   - `design`   — layout + widget chrome (the 80% bucket)
 *   - `data`     — data binding (delegates to existing DataTab)
 *   - `events`   — event → action bindings (placeholder in Sprint 1)
 *   - `motion`   — animations (placeholder in Sprint 1)
 *
 * Mapped to Chinese labels in the UI: 画布 / 设计 / 数据 / 交互 / 动画.
 */
type RightTab = 'canvas' | 'design' | 'data' | 'events' | 'motion'

/**
 * Right-side property panel — refactor of the legacy 3-tab implementation.
 *
 * Selection-driven layout:
 *   - 0 selected           → `canvas` tab only
 *   - 1+ selected          → `design / data / events / motion` tabs
 *
 * Multi-select is forwarded to DesignTab which decides its own layout
 * (homogeneous vs mixed). The 数据 / 交互 / 动画 tabs disable themselves
 * when the selection is multi.
 */
export function PropertyPanel({ onCollapse }: { onCollapse?: () => void } = {}) {
  const editor = useDashboardEditor()
  const selectedIds = useEditorState((s) => s.selectedIds)
  const primaryId = useEditorState((s) => s.primarySelectionId)
  // We can't filter inside `useDocumentState` because the filter
  // depends on `selectedIds` (a different store). The selector would
  // get a stable cache key from documentStore alone and never re-run
  // when `selectedIds` changed — making the multi → single selection
  // transition silently render an empty panel.
  //
  // Pulling the page widgets separately and applying the filter via
  // useMemo lets both sources of truth drive the derived list.
  const pageWidgets = useDocumentState(
    useShallow((s) => selectCurrentPage(s)?.widgets ?? []),
  )
  const widgets = React.useMemo(() => {
    const set = new Set(selectedIds)
    return pageWidgets.filter((w) => set.has(w.id))
  }, [pageWidgets, selectedIds])
  const primaryWidget = useDocumentState((s) =>
    primaryId ? (selectWidget(primaryId)(s) ?? null) : null,
  )

  const hasSelection = widgets.length > 0
  const isSingle = widgets.length === 1
  // `userTab` records the user's explicit choice. The displayed tab is
  // derived: if the current selection doesn't support the chosen tab
  // (e.g. nothing selected but user previously picked 数据), we fall
  // back to a sensible default without ever setting state in an effect.
  const [userTab, setUserTab] = React.useState<RightTab>('design')
  const tab: RightTab = !hasSelection ? 'canvas' : userTab === 'canvas' ? 'design' : userTab
  const setTab = setUserTab
  const [search, setSearch] = React.useState('')

  const meta = primaryWidget
    ? (editor.registry.widgets.get(primaryWidget.type) as WidgetMeta | undefined)
    : undefined

  const handleResetAll = React.useCallback(() => {
    if (!isSingle || !primaryWidget || !meta) return
    editor.updateProps(primaryWidget.id, { ...(meta.defaultProps as Record<string, unknown>) })
  }, [isSingle, primaryWidget, meta, editor])

  const [beautifyOpen, setBeautifyOpen] = React.useState(false)
  const handleAiBeautify = React.useCallback(() => {
    if (!isSingle) return
    setBeautifyOpen(true)
  }, [isSingle])

  return (
    <aside className="border-border bg-card flex h-full w-full flex-col border-l">
      {/* Header — widget identity + status, only when something is selected */}
      {primaryWidget && (
        <WidgetHeader
          widget={primaryWidget}
          meta={meta}
          onJumpToData={() => setTab('data')}
        />
      )}

      {/* Project palette editor — always visible. Replaces the Sprint-2
          ThemePicker; lets users edit the 6 semantic tokens + series
          ramp directly and apply built-in palette templates. */}
      <PaletteEditor />

      {/* Toolbar — search / reset / AI */}
      <PanelToolbar
        search={search}
        onSearch={setSearch}
        onResetAll={isSingle ? handleResetAll : undefined}
        onAiBeautify={isSingle ? handleAiBeautify : undefined}
        onCollapse={onCollapse}
      />

      <AiBeautifyDialog
        open={beautifyOpen}
        onOpenChange={setBeautifyOpen}
        widget={isSingle ? primaryWidget : null}
        meta={meta}
      />

      {/* Tab strip — 5 entries depending on selection */}
      <div
        className="border-border flex items-stretch gap-0.5 border-b px-1"
        role="tablist"
        aria-label="属性面板"
      >
        {!hasSelection && (
          <TabButton
            active={tab === 'canvas'}
            onClick={() => setTab('canvas')}
            icon={PaintRoller}
            label="画布"
          />
        )}
        {hasSelection && (
          <>
            <TabButton
              active={tab === 'design'}
              onClick={() => setTab('design')}
              icon={PaintRoller}
              label="设计"
            />
            <TabButton
              active={tab === 'data'}
              onClick={() => isSingle && setTab('data')}
              disabled={!isSingle}
              icon={Database}
              label="数据"
            />
            <TabButton
              active={tab === 'events'}
              onClick={() => isSingle && setTab('events')}
              disabled={!isSingle}
              icon={MousePointerClick}
              label="交互"
            />
            <TabButton
              active={tab === 'motion'}
              onClick={() => isSingle && setTab('motion')}
              disabled={!isSingle}
              icon={PlayCircle}
              label="动画"
            />
          </>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {tab === 'canvas' && <CanvasProps />}
        {tab === 'design' && widgets.length > 0 && (
          <DesignTab widgets={widgets} meta={meta} searchQuery={search} />
        )}
        {tab === 'design' && widgets.length === 0 && <EmptySelection />}
        {tab === 'data' && <DataTab />}
        {tab === 'events' && primaryWidget && <InteractionsTab widget={primaryWidget} />}
        {tab === 'motion' && primaryWidget && <AnimationsTab widget={primaryWidget} />}
      </ScrollArea>
    </aside>
  )
}

function TabButton({
  active,
  onClick,
  disabled,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        'relative flex flex-1 items-center justify-center gap-1 bg-transparent px-2 py-2 text-[11px] whitespace-nowrap select-none',
        disabled && 'text-muted-foreground/40 cursor-not-allowed',
        !disabled &&
          (active
            ? "text-foreground cursor-pointer font-medium after:bg-primary after:absolute after:right-2 after:-bottom-px after:left-2 after:h-0.5 after:rounded-[1px] after:content-['']"
            : 'text-muted-foreground hover:text-foreground cursor-pointer'),
      )}
    >
      <Icon size={12} />
      {label}
    </button>
  )
}

function EmptySelection() {
  return (
    <div className="text-muted-foreground/80 p-6 text-center">
      <ChartBar size={28} className="text-muted-foreground/40 mx-auto" />
      <div className="mt-2.5 text-[13px]">未选中组件</div>
      <div className="text-muted-foreground/60 mt-1 text-[11px]">
        在画布中点击组件以查看属性
      </div>
    </div>
  )
}
