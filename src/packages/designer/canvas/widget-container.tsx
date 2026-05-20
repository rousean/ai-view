import * as React from 'react'
import type { WidgetMeta } from '@widgets/widget-meta'
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
  const isSelected = useEditorState((s) => s.selectedIds.includes(id))
  const isHovered = useEditorState((s) => s.hoverId === id)

  if (!widget) return null
  if (widget.flags.hidden) return null

  const meta = editor.registry.widgets.get(widget.type) as WidgetMeta | undefined

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
      style={{
        position: 'absolute',
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
        transform: `rotate(${layout.rotate}deg) scale(${layout.flipX ? -1 : 1}, ${layout.flipY ? -1 : 1})`,
        transformOrigin: 'center',
        opacity: layout.opacity,
        pointerEvents: widget.flags.locked ? 'none' : 'auto',
        // Signal interactivity. The handle cursors (set per-handle on
        // ResizeHandles / RotationHandle) win over this when the chrome
        // is rendered, so this only shows when hovering the widget body.
        cursor: widget.flags.locked ? 'default' : 'move',
      }}
    >
      {meta ? (
        <meta.Component
          node={widget}
          props={widget.props as never}
          data={undefined}
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
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'grid',
      placeItems: 'center',
      background: 'rgba(255,0,0,0.06)',
      border: '1px dashed rgba(255,0,0,0.4)',
      color: '#f87171',
      fontSize: 12,
    }}
  >
    未注册组件: {type}
  </div>
)
