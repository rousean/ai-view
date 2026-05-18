import type { DashboardEditor } from '../editor/dashboard-editor'
import { rotatedAABB } from '../canvas/transformer/geometry'
import type { SnapContext } from './types'

/**
 * Build a SnapContext for the current editor state, treating the given
 * `excludeIds` (typically the widgets being moved/resized) as "moving"
 * and the rest as static snap targets.
 */
export function buildSnapContext(editor: DashboardEditor, excludeIds: string[]): SnapContext {
  const page = editor.getCurrentPage()
  const exclude = new Set(excludeIds)
  const staticRects = editor
    .getAllWidgets()
    .filter((w) => !exclude.has(w.id) && !w.flags.hidden)
    .map((w) => rotatedAABB(w))

  return {
    staticRects,
    canvas: page ? { width: page.canvas.width, height: page.canvas.height } : null,
    guides: page?.guides ?? [],
    grid: page && page.grid.enabled ? { size: page.grid.size } : null,
  }
}
