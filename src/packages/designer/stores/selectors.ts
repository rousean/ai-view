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

export const selectWidget =
  (id: string) =>
  (s: DocumentState): WidgetNode | undefined =>
    selectWidgets(s).find((w) => w.id === id)

export const selectDataSource = (id: string) => (s: DocumentState) =>
  s.project?.dataSources.find((ds) => ds.id === id)

export const selectAsset = (id: string) => (s: DocumentState) =>
  s.project?.assets.find((a) => a.id === id)
