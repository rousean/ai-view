import { PlusSquare } from 'lucide-react'
import type { WidgetMeta } from '@widgets/widget-meta'
import { useEditorStore } from '../stores/editor-store'
import type { Tool } from './tool.interface'

/**
 * Place tool — drop a widget of the type stored in
 * `editorStore.toolContext.widgetType`.
 *
 *   - Click → drop at the meta's default size, centred on the pointer.
 *   - Drag  → rubber-band a box; the released size becomes the widget's
 *             size (clamped to the widget's min/max capabilities).
 *
 * Returns to SelectTool after dropping unless `toolLocked` is set.
 *
 * Usage: `editor.setTool('place', { widgetType: 'bar-chart' })`.
 */
interface PlaceState {
  startCanvas?: { x: number; y: number }
}

const DRAG_MIN = 8 // canvas px before a press counts as drag-to-size

export const PlaceTool: Tool = {
  type: 'place',
  label: '放置',
  icon: PlusSquare as Tool['icon'],
  cursor: 'crosshair',

  onPointerDown(e, ctx) {
    const s = ctx.state as PlaceState
    s.startCanvas = ctx.pointer.canvas
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  },

  onPointerMove(_e, ctx) {
    const s = ctx.state as PlaceState
    if (!s.startCanvas) return
    // Live rubber-band preview, reusing the marquee overlay.
    const a = s.startCanvas
    const b = ctx.pointer.canvas
    ctx.editor.bus.emit('plugin.marquee.update', {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.abs(b.x - a.x),
      height: Math.abs(b.y - a.y),
    })
  },

  onPointerUp(_e, ctx) {
    const editor = ctx.editor
    const s = ctx.state as PlaceState
    const start = s.startCanvas
    s.startCanvas = undefined
    editor.bus.emit('plugin.marquee.update', null)

    const { toolContext, toolLocked } = useEditorStore.getState()
    const widgetType = (toolContext as { widgetType?: string }).widgetType
    if (!widgetType) {
      editor.setTool('select')
      return
    }

    const meta = editor.registry.widgets.get(widgetType) as WidgetMeta | undefined
    const defaultSize = meta?.defaultLayout ?? { width: 320, height: 200 }
    const defaultProps = (meta?.defaultProps as Record<string, unknown>) ?? {}
    const caps = meta?.capabilities

    const end = ctx.pointer.canvas
    const dragged =
      !!start &&
      Math.abs(end.x - start.x) >= DRAG_MIN &&
      Math.abs(end.y - start.y) >= DRAG_MIN

    let position: { x: number; y: number }
    let size: { width: number; height: number }
    if (dragged && start) {
      // Drag-to-size, clamped to the widget's declared bounds.
      const minW = caps?.minSize?.width ?? 1
      const minH = caps?.minSize?.height ?? 1
      const maxW = caps?.maxSize?.width ?? Infinity
      const maxH = caps?.maxSize?.height ?? Infinity
      size = {
        width: Math.min(maxW, Math.max(minW, Math.abs(end.x - start.x))),
        height: Math.min(maxH, Math.max(minH, Math.abs(end.y - start.y))),
      }
      position = { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y) }
    } else {
      // Plain click → default size, centred on the pointer.
      size = defaultSize
      const p = start ?? end
      position = { x: p.x - size.width / 2, y: p.y - size.height / 2 }
    }

    // addWidget auto-selects the new widget.
    editor.addWidget(widgetType, { position, size, props: defaultProps })

    if (!toolLocked) editor.setTool('select')
  },

  onDeactivate(ctx) {
    // Clear any half-drawn preview if the user switches tools mid-drag.
    const s = ctx.state as PlaceState
    if (s.startCanvas) {
      s.startCanvas = undefined
      ctx.editor.bus.emit('plugin.marquee.update', null)
    }
  },
}
