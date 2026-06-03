import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useDocumentStore } from '../stores/document-store'
import { useEditorStore } from '../stores/editor-store'
import { selectCurrentPage, selectWidgets } from '../stores/selectors'
import { rotatedAABB } from './transformer/geometry'
import { WidgetContainer } from './widget-container'

// Above this widget count, cull off-screen widgets so we don't mount
// (and, for charts, `echarts.init`) hundreds of instances at once. Small
// boards skip culling — the per-frame visibility pass isn't worth it.
const VIRTUALIZE_THRESHOLD = 60
// Keep widgets within this many *screen* px of the viewport mounted, so
// they're ready before they scroll into view (no pop-in).
const VIEWPORT_MARGIN = 300

/**
 * Iterates the current page's widget order and renders one
 * `<WidgetContainer/>` per id. Subscribes only to the *id list* (with shallow
 * comparison) so adding / removing one widget triggers exactly one rerender
 * of this layer; per-widget changes are isolated to WidgetContainer.
 *
 * Wraps the widgets in a page-sized `overflow: hidden` box so any content
 * dragged past the artboard's edge is clipped — the page is the published
 * surface, so anything outside it should not be visible. Selection chrome
 * / hover indicators / alignment guides live outside this clip layer so
 * they remain visible when a widget is partially off-page (giving the
 * user something to grab to drag the widget back).
 */
export const WidgetLayer: React.FC = () => {
  const widgets = useDocumentStore(useShallow((s) => selectWidgets(s)))
  const canvas = useDocumentStore((s) => selectCurrentPage(s)?.canvas ?? null)
  const camera = useEditorStore((s) => s.camera)
  const viewport = useEditorStore((s) => s.viewportSize)

  // Viewport culling: keep only widgets whose visual (rotated) bounds
  // intersect the visible canvas rect (+ margin). Gated behind a count
  // threshold so typical boards render exactly as before (and don't pay
  // the per-frame pass while panning).
  const visibleIds = React.useMemo(() => {
    if (widgets.length <= VIRTUALIZE_THRESHOLD || viewport.width === 0) {
      return widgets.map((w) => w.id)
    }
    const margin = VIEWPORT_MARGIN / camera.scale
    const vx = -camera.x / camera.scale - margin
    const vy = -camera.y / camera.scale - margin
    const vw = viewport.width / camera.scale + margin * 2
    const vh = viewport.height / camera.scale + margin * 2
    return widgets
      .filter((w) => {
        const b = rotatedAABB(w)
        return b.x + b.width >= vx && b.x <= vx + vw && b.y + b.height >= vy && b.y <= vy + vh
      })
      .map((w) => w.id)
  }, [widgets, camera, viewport])

  if (!canvas) return null

  return (
    <div
      className="absolute top-0 left-0 overflow-hidden"
      style={{ width: canvas.width, height: canvas.height }}
    >
      {visibleIds.map((id) => (
        <WidgetContainer key={id} id={id} />
      ))}
    </div>
  )
}
