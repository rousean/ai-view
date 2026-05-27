import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { WidgetMeta } from '@widgets/widget-meta'
import { indexDataSources, resolveWidgetData } from '@designer/data'
import { cn } from '~/lib/utils'
import { useDashboardEditor, useDocumentState, useEditorState } from '../editor/editor-context'
import { selectWidget } from '../stores/selectors'

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

  const meta = widget
    ? (editor.registry.widgets.get(widget.type) as WidgetMeta | undefined)
    : undefined

  // Resolve the widget's data (slot-projected, sample-filled when no
  // user data exists) so the component reads a single consistent shape.
  // Memo keyed on the inputs that actually affect the output — widget
  // identity (so reordering doesn't churn), data, and the source list.
  const resolvedData = React.useMemo(() => {
    if (!widget) return null
    return resolveWidgetData(widget, meta, indexDataSources(dataSources))
  }, [widget, meta, dataSources])

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
  return (
    <div
      data-widget-id={widget.id}
      data-widget-type={widget.type}
      data-selected={isSelected || undefined}
      data-hover={isHovered || undefined}
      className={cn(
        'absolute origin-center',
        widget.flags.locked ? 'pointer-events-none cursor-default' : 'pointer-events-auto cursor-move',
      )}
      style={{
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
        transform: `rotate(${layout.rotate}deg) scale(${layout.flipX ? -1 : 1}, ${layout.flipY ? -1 : 1})`,
        opacity: layout.opacity,
      }}
    >
      {meta ? (
        <meta.Component
          node={widget}
          props={widget.props as never}
          data={resolvedData}
          layout={layout}
          designMode
        />
      ) : (
        <UnknownWidgetFallback type={widget.type} />
      )}
    </div>
  )
})

const UnknownWidgetFallback: React.FC<{ type: string }> = ({ type }) => (
  <div className="bg-destructive/10 border-destructive/40 text-destructive grid h-full w-full place-items-center border border-dashed text-xs">
    未注册组件: {type}
  </div>
)
