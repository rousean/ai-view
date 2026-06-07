import type { Page, Project, WidgetNode } from '@schema/types'
import type { DocumentState } from './document-store'

/**
 * Reusable selectors over DocumentState. Pure functions; no React.
 * Use them inside `useDocumentStore(selectXxx)` calls.
 */

export const selectProject = (s: DocumentState): Project | null => s.project

export const selectCurrentPage = (s: DocumentState): Page | null => {
  if (!s.project) return null
  return s.project.pages.find((p) => p.id === s.project!.currentPageId) ?? null
}

export const selectCurrentPageId = (s: DocumentState): string | null =>
  s.project?.currentPageId ?? null

export const selectPages = (s: DocumentState): Page[] => s.project?.pages ?? []

export const selectWidgets = (s: DocumentState): WidgetNode[] => selectCurrentPage(s)?.widgets ?? []

/**
 * Per-widgets-array memoized id→node index, so `selectWidget` is O(1)
 * instead of O(n). Every WidgetContainer re-runs its selector on every
 * document mutation; with a linear `.find` that's O(mounted × widgets)
 * per frame during a drag. The widgets array gets a fresh identity on
 * each immer patch, so the WeakMap entry is rebuilt at most once per
 * frame and then shared by every lookup in that notify cycle.
 */
const widgetIndexCache = new WeakMap<WidgetNode[], Map<string, WidgetNode>>()

function widgetIndex(widgets: WidgetNode[]): Map<string, WidgetNode> {
  let idx = widgetIndexCache.get(widgets)
  if (!idx) {
    idx = new Map(widgets.map((w) => [w.id, w]))
    widgetIndexCache.set(widgets, idx)
  }
  return idx
}

export const selectWidget =
  (id: string) =>
  (s: DocumentState): WidgetNode | undefined =>
    widgetIndex(selectWidgets(s)).get(id)

export const selectDataSource = (id: string) => (s: DocumentState) =>
  s.project?.dataSources.find((ds) => ds.id === id)

export const selectAsset = (id: string) => (s: DocumentState) =>
  s.project?.assets.find((a) => a.id === id)
