import type { Layout, Page, Project, WidgetNode } from '@schema/types'

/** Locate the current page index in `draft.pages` array (or -1). */
export function findCurrentPageIndex(draft: Project): number {
  return draft.pages.findIndex((p) => p.id === draft.currentPageId)
}

/** Locate the current page directly. Throws if missing. */
export function getCurrentPage(draft: Project): Page {
  const idx = findCurrentPageIndex(draft)
  if (idx < 0) throw new Error('No current page in draft')
  return draft.pages[idx]
}

/** Find a widget on the current page by id. */
export function findWidget(draft: Project, id: string): WidgetNode | undefined {
  const page = getCurrentPage(draft)
  return page.widgets.find((w) => w.id === id)
}

/** Find widget index on current page. */
export function findWidgetIndex(draft: Project, id: string): number {
  const page = getCurrentPage(draft)
  return page.widgets.findIndex((w) => w.id === id)
}

/** Default layout for a brand-new widget at a given drop point. */
export function makeDefaultLayout(opts: {
  position?: { x: number; y: number }
  size?: { width: number; height: number }
}): Layout {
  return {
    x: opts.position?.x ?? 0,
    y: opts.position?.y ?? 0,
    width: opts.size?.width ?? 320,
    height: opts.size?.height ?? 200,
    rotate: 0,
    flipX: false,
    flipY: false,
    opacity: 1,
  }
}
