import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { WidgetMeta } from '@widgets/widget-meta'
import { indexDataSources, resolveWidgetData } from '@designer/data'
import { WidgetView } from '@renderer/widget-view'
import { cn } from '~/lib/utils'
import { useDashboardEditor, useDocumentState, useEditorState } from '../editor/editor-context'
import { dispatchEvent } from '../interactions'
import { useFilterStore } from '../stores/filter-store'
import { selectWidget } from '../stores/selectors'
import { useRuntimeStore } from '../stores/runtime-store'

interface WidgetContainerProps {
  id: string
}

/**
 * Renders a single widget at its layout. Subscribes only to its own widget
 * record + selected/hover bits so unrelated widget changes do not rerender it.
 *
 * Heavy children (e.g. ECharts) are isolated by React.memo on this container.
 */
export const WidgetContainer: React.FC<WidgetContainerProps> = React.memo(function WidgetContainer({
  id,
}) {
  const editor = useDashboardEditor()
  const widget = useDocumentState((s) => selectWidget(id)(s) ?? null)
  // useShallow so subscriptions only re-fire when the dataSources array
  // identity changes — not every other document mutation.
  const dataSources = useDocumentState(useShallow((s) => s.project?.dataSources ?? []))
  const isSelected = useEditorState((s) => s.selectedIds.includes(id))
  const isHovered = useEditorState((s) => s.hoverId === id)
  // Bumps when the user hits "preview animation" in the AnimationsTab.
  // We mount the inner shell under a key derived from this number so the
  // CSS keyframe re-plays deterministically (re-mount = fresh animation).
  const animationPreviewToken = useRuntimeStore(
    (s) => s.animationPreviewTokens[id] ?? 0,
  )
  // Preview-mode wiring: in design mode we never fire bindings (editing
  // your click handler shouldn't navigate the editor away), and we never
  // draw the highlight ring.
  const mode = useRuntimeStore((s) => s.mode)
  const isHighlighted = useRuntimeStore((s) => s.highlightedIds.has(id))
  const isPreview = mode === 'preview'
  // Active cross-widget filter — only consulted in preview. Filters
  // are write-only at design time so editing doesn't surprise the
  // author with disappearing rows.
  const activeFilter = useFilterStore((s) =>
    isPreview ? s.filters[id] : undefined,
  )

  // Data-source status surface — when this widget is bound to a source
  // currently loading / erroring, we overlay a small banner so authors
  // never look at a "perfectly rendered chart of sample data" without
  // noticing the live source has died.
  const boundSourceId =
    widget?.data?.mode === 'bound' ? widget.data.sourceId : undefined
  const fetchStatus = useRuntimeStore((s) =>
    boundSourceId ? s.fetchStatus[boundSourceId] : undefined,
  )
  // Subscribe to this widget's bound-source dataset so the chart actually
  // re-resolves when live / polled data lands. The fetcher writes data via
  // `setFetchedData` then flips `fetchStatus`; without this dep the memo
  // below (keyed only on widget/meta/sources/filter) would keep returning
  // the meta sample, so a bound widget would never show real data until its
  // node happened to change for some other reason.
  const boundFetchedData = useRuntimeStore((s) =>
    boundSourceId ? s.fetchedData[boundSourceId] : undefined,
  )

  const meta = widget
    ? (editor.registry.widgets.get(widget.type) as WidgetMeta | undefined)
    : undefined

  // Holds the datum detail (a clicked slice's {name,value}) that a chart
  // stashes via `onInteract` just before the DOM click bubbles up here, so
  // the dispatched binding (e.g. `filter`) gets the value the user clicked.
  const pendingDetailRef = React.useRef<Record<string, unknown> | undefined>(undefined)

  // Resolve the widget's data (slot-projected, sample-filled when no
  // user data exists) so the component reads a single consistent shape.
  // Memo keyed on the inputs that actually affect the output — widget
  // identity (so reordering doesn't churn), data, and the source list.
  const resolvedData = React.useMemo(() => {
    if (!widget) return null
    // Feed just this widget's bound-source data to the resolver (keyed by
    // id, the shape it expects). Listing `boundFetchedData` in the deps is
    // what makes a fetch / poll update repaint the widget — and scoping it
    // to this source means an unrelated source's update doesn't re-resolve
    // every widget on the page.
    const fetched =
      boundSourceId && boundFetchedData !== undefined
        ? { [boundSourceId]: boundFetchedData }
        : {}
    return resolveWidgetData(
      widget,
      meta,
      indexDataSources(dataSources),
      activeFilter,
      fetched,
    )
  }, [widget, meta, dataSources, activeFilter, boundSourceId, boundFetchedData])

  if (!widget || !resolvedData) return null
  if (widget.flags.hidden) return null

  const layout = widget.layout
  // Pivot all transforms (rotate, scale/flip) around the widget's visual
  // centre so that:
  //   1. rotation gestures (which use bbox-centre as pivot) match what's
  //      drawn on screen — the widget spins in place, not around its
  //      top-left;
  //   2. the selection chrome (also pivoted at centre) stays aligned with
  //      the widget;
  //   3. flipX/flipY mirror around the centre line, which is what users
  //      expect.
  //
  // The base position uses `left/top` (NOT translate) so the
  // centre-pivoted transform composes cleanly without offset bookkeeping.
  // In preview mode the cursor reflects the bindings — a widget with
  // any enabled click/dblclick binding becomes a pointer.
  const hasClickBinding =
    isPreview &&
    !!widget.events?.some(
      (b) => b.enabled && (b.trigger === 'click' || b.trigger === 'dblclick'),
    )

  return (
    <div
      data-widget-id={widget.id}
      data-widget-type={widget.type}
      data-selected={isSelected || undefined}
      data-hover={isHovered || undefined}
      data-highlight={isHighlighted || undefined}
      className={cn(
        'absolute origin-center',
        widget.flags.locked || isPreview
          ? hasClickBinding
            ? 'pointer-events-auto cursor-pointer'
            : 'pointer-events-none cursor-default'
          : 'pointer-events-auto cursor-move',
        // Highlight ring — drawn outside the widget so its content
        // isn't clipped. Pulses briefly via tw-animate-css.
        isHighlighted && 'ring-primary animate-pulse rounded-sm ring-2 ring-offset-2',
      )}
      style={{
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
        transform: `rotate(${layout.rotate}deg) scale(${layout.flipX ? -1 : 1}, ${layout.flipY ? -1 : 1})`,
        opacity: layout.opacity,
      }}
      onClick={
        isPreview
          ? (e) => {
              e.stopPropagation()
              dispatchEvent('click', {
                source: widget,
                editor,
                detail: pendingDetailRef.current,
              })
              pendingDetailRef.current = undefined
            }
          : undefined
      }
      onDoubleClick={
        isPreview
          ? (e) => {
              e.stopPropagation()
              dispatchEvent('dblclick', {
                source: widget,
                editor,
                detail: pendingDetailRef.current,
              })
              pendingDetailRef.current = undefined
            }
          : undefined
      }
      onMouseEnter={
        isPreview ? () => dispatchEvent('hover', { source: widget, editor }) : undefined
      }
    >
      {/* WidgetView owns the enter-animation shell now; `replayToken`
          (the preview token) forces a remount so the keyframe replays. */}
      <WidgetView
        node={widget}
        meta={meta}
        data={resolvedData}
        designMode={!isPreview}
        replayToken={`${id}-${animationPreviewToken}`}
        // Only in preview: stash the clicked datum for the dispatch above.
        // Gated so design mode keeps the chart's default cursor / selection
        // behaviour (a chart wired with onInteract shows a pointer cursor).
        onInteract={
          isPreview
            ? (_trigger, detail) => {
                pendingDetailRef.current = detail
              }
            : undefined
        }
        onError={(err) =>
          useRuntimeStore.getState().actions.setWidgetError(widget.id, {
            message: err.message,
            stack: err.stack,
          })
        }
      />
      {/* Data-source status banner — overlay, not inline, so it never
          pushes the chart out of layout. Skip in preview to keep the
          published view clean. */}
      {!isPreview && fetchStatus && fetchStatus.state !== 'success' && (
        <DataStatusBanner status={fetchStatus} />
      )}
    </div>
  )
})

/**
 * Overlay strip pinned to the widget's top edge that reports the bound
 * data source's live state. Rendered design-time only; preview mode
 * hides it so end users don't see editor scaffolding.
 *
 * Style:
 *   - loading → blue with a spinner glyph
 *   - error   → amber with the truncated error message
 *
 * The strip uses `pointer-events-none` so it doesn't steal clicks
 * from the widget body underneath.
 */
function DataStatusBanner({
  status,
}: {
  status: { state: string; error?: string; updatedAt?: number }
}) {
  if (status.state === 'loading') {
    return (
      <div
        className="bg-sky-500/15 text-sky-700 pointer-events-none absolute top-0 left-0 flex w-full items-center gap-1 px-2 py-0.5 text-[10px] dark:text-sky-300"
        data-skip-snapshot
      >
        <span className="inline-block size-1.5 animate-pulse rounded-full bg-current" />
        数据加载中…
      </div>
    )
  }
  if (status.state === 'error') {
    return (
      <div
        className="bg-amber-500/15 text-amber-700 pointer-events-none absolute top-0 left-0 flex w-full items-center gap-1 px-2 py-0.5 text-[10px] dark:text-amber-300"
        data-skip-snapshot
        title={status.error}
      >
        ⚠ 数据源加载失败 · {(status.error ?? '').slice(0, 40)}
      </div>
    )
  }
  return null
}
