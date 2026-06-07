import * as React from 'react'
import type { Asset, DataSource, Page, Project, WidgetNode } from '@schema/types'
import { LocalStoragePersistence } from '@schema/index'
import { builtinWidgets, type WidgetMeta } from '@widgets/index'
import { indexDataSources, resolveWidgetData } from '@renderer/resolve'
import { WidgetView } from '@renderer/widget-view'
import { reconcileFetchers, stopAllFetchers } from '@designer/data'
import { useFilterStore, useRuntimeStore } from '@designer/stores'
import { dispatchEvent, type DispatchHost } from '@designer/interactions'
import { cn } from '~/lib/utils'

/**
 * Read-only runtime renderer for a saved Project.
 *
 * No editor chrome, no selection, no tool dispatch — just walks the
 * current page's widget tree and lays each widget out at its `layout`
 * position. Components come from `builtinWidgets`.
 *
 * Used inside the management Dashboard tile and the fullscreen preview
 * route. Both mount exactly one instance at a time, so it's safe to drive
 * the module-level fetcher singleton from here.
 */
export function ProjectRuntime({
  projectId,
  scale,
  className,
}: {
  /** When omitted, loads the first project from localStorage. */
  projectId?: string
  /**
   * Scale factor for the canvas. Caller typically computes
   * `min(container.width / canvas.width, container.height / canvas.height)`.
   */
  scale: number
  className?: string
}) {
  const [project, setProject] = React.useState<Project | null>(null)
  // Active page id. Kept separate from `project` so `navigatePage` can swap
  // pages without mutating (and re-identifying) the loaded project — which
  // would needlessly churn the data-source fetchers below.
  const [currentPageId, setCurrentPageId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const widgetMap = React.useMemo(() => {
    const map = new Map<string, WidgetMeta>()
    for (const meta of builtinWidgets) map.set(meta.type, meta as unknown as WidgetMeta)
    return map
  }, [])
  // Live data published by the API fetchers (keyed by source id).
  // Subscribing here repaints the runtime when a fetch / poll lands so
  // bound widgets show real data instead of the meta sample.
  const fetchedData = useRuntimeStore((s) => s.fetchedData)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const adapter = new LocalStoragePersistence()
        let id = projectId
        if (!id) {
          const summaries = await adapter.list()
          id = summaries[0]?.id
        }
        if (!id) {
          if (!cancelled) setError('未找到任何已保存的大屏')
          return
        }
        const p = await adapter.load(id)
        if (!cancelled) {
          setProject(p)
          setCurrentPageId(p.currentPageId)
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Drive API data sources: start fetchers once the project loads, stop
  // them on unmount / project switch. Mirrors EditorRoot's lifecycle — the
  // runtime is read-only so the source list is static (no reconcile loop
  // on document mutations needed).
  React.useEffect(() => {
    if (!project) return
    reconcileFetchers(project.dataSources)
    return () => stopAllFetchers()
  }, [project])

  // Cross-component interactions. The `navigatePage` action needs somewhere
  // to swap the rendered page; the runtime has no editor, so we hand the
  // dispatcher a minimal host that drives the local `currentPageId`. The
  // other actions (filter / highlight) talk to the global runtime stores
  // directly, exactly as they do under the designer's preview.
  const switchPage = React.useCallback(
    (pageId: string) => {
      if (!project) return
      // Validate the target exists; no-op otherwise (mirrors the editor's
      // switchPage facade, which the designer routes navigatePage through).
      if (!project.pages.some((p) => p.id === pageId)) return
      setCurrentPageId((prev) => (prev === pageId ? prev : pageId))
      // Drop cross-widget filters on navigation so a filter pinned on the
      // previous page doesn't poison the next (mirrors PreviewOverlay).
      useFilterStore.getState().actions.clearAll()
    },
    [project],
  )
  const dispatchHost = React.useMemo<DispatchHost>(() => ({ switchPage }), [switchPage])

  // Cross-widget filters / highlights live in global runtime stores. Clear
  // them when this runtime mounts and unmounts so a session never inherits
  // stale state from a previous project or a designer preview (mirrors
  // PreviewOverlay's enter/exit cleanup).
  React.useEffect(() => {
    const clearFilters = useFilterStore.getState().actions.clearAll
    clearFilters()
    return () => {
      clearFilters()
      const active = useRuntimeStore.getState().highlightedIds
      if (active.size > 0) {
        useRuntimeStore.getState().actions.removeHighlights([...active])
      }
    }
  }, [projectId])

  if (error) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center text-sm text-white/60',
          className,
        )}
      >
        {error}
      </div>
    )
  }

  if (!project) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center text-sm text-white/40',
          className,
        )}
      >
        加载中…
      </div>
    )
  }

  const activePageId = currentPageId ?? project.currentPageId
  const page: Page | undefined = project.pages.find((p) => p.id === activePageId)
  if (!page) return null

  const { width, height } = page.canvas
  const bg = pageBackground(page, project.assets)
  const dataSources = indexDataSources(project.dataSources)

  return (
    <div
      className={cn('relative origin-top-left overflow-hidden', className)}
      style={{
        width,
        height,
        transform: `scale(${scale})`,
        ...bg,
      }}
    >
      {page.widgets.map((w) => (
        <RuntimeWidget
          key={w.id}
          node={w}
          meta={widgetMap.get(w.type)}
          dataSources={dataSources}
          fetchedData={fetchedData}
          host={dispatchHost}
        />
      ))}
    </div>
  )
}

function RuntimeWidget({
  node,
  meta,
  dataSources,
  fetchedData,
  host,
}: {
  node: WidgetNode
  meta: WidgetMeta | undefined
  dataSources: Record<string, DataSource>
  fetchedData: Record<string, unknown>
  host: DispatchHost
}) {
  // Highlight ring (from a `highlight` action) and the active cross-widget
  // filter (from a `filter` action) are global runtime concerns. Subscribe
  // per-widget so only the affected widget repaints — and call these hooks
  // before the hidden-early-return so hook order stays stable.
  const isHighlighted = useRuntimeStore((s) => s.highlightedIds.has(node.id))
  const activeFilter = useFilterStore((s) => s.filters[node.id])
  // Datum detail a chart stashes via `onInteract` right before the DOM
  // click bubbles up here — lets the dispatched binding read the value the
  // user actually clicked (e.g. the `filter` action).
  const pendingDetailRef = React.useRef<Record<string, unknown> | undefined>(undefined)

  if (node.flags.hidden) return null
  const { layout } = node

  // Build the resolved data the component reads. Same resolver the designer
  // uses (filter applied here too), so runtime matches the designer preview.
  const data = resolveWidgetData(node, meta, dataSources, activeFilter, fetchedData)

  // Pointer affordance when the widget carries an enabled click/dblclick
  // binding — matches the designer's preview cursor.
  const hasClickBinding = !!node.events?.some(
    (b) => b.enabled && (b.trigger === 'click' || b.trigger === 'dblclick'),
  )

  return (
    <div
      data-widget-id={node.id}
      data-highlight={isHighlighted || undefined}
      className={cn(
        'absolute origin-center',
        hasClickBinding && 'cursor-pointer',
        // Highlight ring — drawn outside the widget so its content isn't
        // clipped. Pulses briefly via tw-animate-css.
        isHighlighted && 'ring-primary animate-pulse rounded-sm ring-2 ring-offset-2',
      )}
      style={{
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
        transform: `rotate(${layout.rotate}deg) scale(${layout.flipX ? -1 : 1}, ${layout.flipY ? -1 : 1})`,
        opacity: layout.opacity,
      }}
      onClick={(e) => {
        e.stopPropagation()
        dispatchEvent('click', { source: node, editor: host, detail: pendingDetailRef.current })
        pendingDetailRef.current = undefined
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        dispatchEvent('dblclick', { source: node, editor: host, detail: pendingDetailRef.current })
        pendingDetailRef.current = undefined
      }}
      onMouseEnter={() => dispatchEvent('hover', { source: node, editor: host })}
    >
      <WidgetView
        node={node}
        meta={meta}
        data={data}
        designMode={false}
        onInteract={(_trigger, detail) => {
          pendingDetailRef.current = detail
        }}
      />
    </div>
  )
}

/** Translate the page's `Background` shape into CSS background properties. */
function pageBackground(page: Page, assets: Asset[]): React.CSSProperties {
  const bg = page.canvas.background
  switch (bg.type) {
    case 'color':
      return { background: bg.color }
    case 'gradient': {
      const stops = bg.gradient.stops
        .map((s) => `${s.color} ${(s.offset * 100).toFixed(2)}%`)
        .join(', ')
      return {
        background:
          bg.gradient.type === 'linear'
            ? `linear-gradient(${bg.gradient.angle ?? 180}deg, ${stops})`
            : `radial-gradient(${stops})`,
      }
    }
    case 'image': {
      const asset = assets.find((a) => a.id === bg.assetId)
      if (!asset?.url) return { background: 'rgba(127,127,127,0.06)' }
      const size = bg.fit === 'cover' ? 'cover' : bg.fit === 'contain' ? 'contain' : '100% 100%'
      return {
        backgroundImage: `url(${asset.url})`,
        backgroundSize: size,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    }
    case 'transparent':
    default:
      return { background: 'transparent' }
  }
}
