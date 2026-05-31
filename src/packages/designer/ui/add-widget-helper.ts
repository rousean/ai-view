import type { WidgetMeta } from '@widgets/widget-meta'
import type { DashboardEditor } from '../editor/dashboard-editor'

/**
 * Drop a widget at the centre of the *visible canvas viewport*.
 *
 * Used by both the command palette and the materials panel's
 * double-click shortcut so "add without dragging" always lands the
 * widget where the user is actually looking — not at the artboard's
 * geometric centre, which can sit far off-screen on a large (e.g.
 * 1920×1080) canvas viewed through a smaller editor window.
 *
 * Falls back to the artboard centre when the canvas element can't be
 * measured (SSR, headless tests). The position is clamped so the
 * widget always lands fully inside the page bounds.
 *
 * Returns the new widget id (or undefined when there's no active page).
 */
export function addWidgetAtViewportCenter(
  editor: DashboardEditor,
  meta: WidgetMeta,
): string | undefined {
  const page = editor.getCurrentPage()
  if (!page) return undefined
  const size = meta.defaultLayout

  // Default to the artboard centre; refine to the viewport centre when
  // we can measure the live canvas element.
  let topLeftX = (page.canvas.width - size.width) / 2
  let topLeftY = (page.canvas.height - size.height) / 2

  if (typeof document !== 'undefined') {
    const vp = document.querySelector<HTMLElement>('[data-canvas-viewport]')
    if (vp) {
      const r = vp.getBoundingClientRect()
      const centre = editor.screenToCanvas(
        { x: r.left + r.width / 2, y: r.top + r.height / 2 },
        { left: r.left, top: r.top },
      )
      topLeftX = centre.x - size.width / 2
      topLeftY = centre.y - size.height / 2
    }
  }

  const x = Math.max(0, Math.min(page.canvas.width - size.width, Math.round(topLeftX)))
  const y = Math.max(0, Math.min(page.canvas.height - size.height, Math.round(topLeftY)))

  return editor.addWidget(meta.type, {
    position: { x, y },
    size,
    props: meta.defaultProps as Record<string, unknown>,
  })
}
