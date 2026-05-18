import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useDocumentStore } from '../stores/document-store'
import { selectCurrentPage, selectWidgets } from '../stores/selectors'
import { WidgetContainer } from './widget-container'

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
  const ids = useDocumentStore(useShallow((s) => selectWidgets(s).map((w) => w.id)))
  const canvas = useDocumentStore((s) => selectCurrentPage(s)?.canvas ?? null)

  if (!canvas) return null

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: canvas.width,
        height: canvas.height,
        overflow: 'hidden',
      }}
    >
      {ids.map((id) => (
        <WidgetContainer key={id} id={id} />
      ))}
    </div>
  )
}
