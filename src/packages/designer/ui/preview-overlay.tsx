import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Eye, Filter, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useDashboardEditor, useDocumentState } from '../editor/editor-context'
import { useFilterStore } from '../stores/filter-store'
import { useRuntimeStore } from '../stores/runtime-store'
import { selectCurrentPage, selectPages } from '../stores/selectors'
import { cn } from '~/lib/utils'
import { WidgetContainer } from '../canvas/widget-container'
import { PageBackground } from '../canvas/page-background'

/**
 * Full-screen preview surface. Mounted (and centered to fit-screen) only
 * when `runtimeStore.mode === 'preview'`. Hosts:
 *
 *   - the page background;
 *   - one WidgetContainer per widget in render order (z-index = index);
 *   - a minimal top bar with an ESC affordance and active-filter pill.
 *
 * Interactions are wired by WidgetContainer itself (which reads the
 * mode and routes click/dblclick/hover through `dispatchEvent`), so
 * this component stays purely structural — no event plumbing of its
 * own beyond closing and clearing filters.
 */
export function PreviewOverlay() {
  const editor = useDashboardEditor()
  const mode = useRuntimeStore((s) => s.mode)
  const setMode = useRuntimeStore((s) => s.actions.setMode)
  const clearHighlights = useRuntimeStore((s) => s.actions.removeHighlights)
  const clearFilters = useFilterStore((s) => s.actions.clearAll)
  const filters = useFilterStore((s) => s.filters)
  const page = useDocumentState((s) => selectCurrentPage(s))
  const pages = useDocumentState(useShallow((s) => selectPages(s)))
  const currentPageId = useDocumentState((s) => s.project?.currentPageId ?? null)

  // Re-fit on window resize. `computeFitScale` reads window dimensions
  // directly, so without a re-render on resize the canvas keeps the
  // scale it had when preview opened — dragging the browser window then
  // either clips the canvas or strands it in a corner.
  const [, forceResize] = React.useReducer((n: number) => n + 1, 0)
  React.useEffect(() => {
    if (mode !== 'preview') return
    const onResize = () => forceResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [mode])

  // ESC exits preview. Wired here (not inside the canvas) so it works
  // even when focus is on the overlay's chrome rather than a widget.
  React.useEffect(() => {
    if (mode !== 'preview') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMode('design')
        clearFilters()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, setMode, clearFilters])

  // Clear active filters / highlights on enter and exit so each preview
  // session starts clean — otherwise a leftover filter from a prior
  // session can make widgets look broken.
  React.useEffect(() => {
    if (mode === 'preview') clearFilters()
    return () => {
      clearFilters()
      // Drop every still-active highlight. Passing the *current* id set
      // matters — the old `clearHighlights([])` removed nothing, so a
      // widget mid-pulse when the user hit ESC kept flashing into design
      // mode until its (up to 5s) timer fired.
      const active = useRuntimeStore.getState().highlightedIds
      if (active.size > 0) clearHighlights([...active])
    }
  }, [mode, clearFilters, clearHighlights])

  if (mode !== 'preview' || !page) return null

  const canvasW = page.canvas.width
  const canvasH = page.canvas.height
  // Reserve the bottom page-switcher strip's height (36px) only when it
  // actually renders — single-page projects use the full height.
  const hasPageBar = pages.length > 1
  const fitScale = computeFitScale(canvasW, canvasH, hasPageBar ? 36 : 0)
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col">
      {/* Minimal top bar — overlays the canvas so it never steals layout. */}
      <div className="border-border bg-card/90 flex h-9 shrink-0 items-center gap-2 border-b px-3 backdrop-blur">
        <span className="text-foreground/85 flex items-center gap-1.5 text-[12px] font-medium">
          <Eye size={13} className="text-primary" />
          预览模式 · {page.name}
        </span>
        {activeFilterCount > 0 && (
          <span className="bg-primary/10 text-primary flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]">
            <Filter size={10} />
            {activeFilterCount} 个过滤
            <button
              type="button"
              onClick={() => clearFilters()}
              className="hover:text-foreground ml-1 cursor-pointer"
              aria-label="清除所有过滤"
            >
              <X size={10} />
            </button>
          </span>
        )}
        <div className="flex-1" />
        <span className="text-muted-foreground/70 text-[10px]">
          ESC 退出
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            setMode('design')
            clearFilters()
          }}
        >
          <X size={12} />
          <span className="ml-1">关闭</span>
        </Button>
      </div>

      {/* Fit-screen canvas. Black bands surround it on mismatched aspect
          ratios so widget shadows / decorations don't bleed off-screen. */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black/5 dark:bg-black/40">
        <div
          className="relative origin-center"
          style={{
            width: canvasW,
            height: canvasH,
            transform: `scale(${fitScale})`,
          }}
        >
          <PageBackground />
          {page.widgets.map((w) => (
            <WidgetContainer key={w.id} id={w.id} />
          ))}
        </div>
      </div>

      {/* Page switcher — only when the project actually has multiple
          pages. Click switches; we reset filters so a left-over filter
          from page A doesn't poison page B. */}
      {pages.length > 1 && (
        <div className="border-border bg-card/90 flex h-9 shrink-0 items-center gap-0.5 overflow-x-auto border-t px-3 backdrop-blur [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {pages.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (p.id === currentPageId) return
                clearFilters()
                editor.switchPage(p.id)
              }}
              className={cn(
                'flex h-7 shrink-0 cursor-pointer items-center rounded-md px-3 text-xs whitespace-nowrap transition-colors',
                p.id === currentPageId
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Compute scale that fits canvasW × canvasH inside the window viewport.
 * `reserveBottom` subtracts the optional page-switcher strip so the
 * canvas never tucks behind it.
 */
function computeFitScale(canvasW: number, canvasH: number, reserveBottom = 0): number {
  if (typeof window === 'undefined') return 1
  // Subtract the 36px top header + 32px padding, plus any bottom strip.
  const availW = window.innerWidth - 32
  const availH = window.innerHeight - 36 - 32 - reserveBottom
  if (canvasW <= 0 || canvasH <= 0) return 1
  return Math.min(availW / canvasW, availH / canvasH, 1)
}
