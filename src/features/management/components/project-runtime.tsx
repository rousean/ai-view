import * as React from 'react'
import type { DataSource, Page, Project, WidgetNode } from '@schema/types'
import { LocalStoragePersistence } from '@schema/index'
import { builtinWidgets, type WidgetMeta } from '@widgets/index'
import { indexDataSources, resolveWidgetData } from '@renderer/resolve'
import { WidgetView } from '@renderer/widget-view'
import { cn } from '~/lib/utils'

/**
 * Read-only runtime renderer for a saved Project.
 *
 * No editor chrome, no selection, no tool dispatch — just walks the
 * current page's widget tree and lays each widget out at its `layout`
 * position. Components come from `builtinWidgets`.
 *
 * Used inside the management Dashboard tile and (eventually) the
 * fullscreen preview route.
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
  const [error, setError] = React.useState<string | null>(null)
  const widgetMap = React.useMemo(() => {
    const map = new Map<string, WidgetMeta>()
    for (const meta of builtinWidgets) map.set(meta.type, meta as unknown as WidgetMeta)
    return map
  }, [])

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
        if (!cancelled) setProject(p)
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      }
    })()
    return () => {
      cancelled = true
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

  const page: Page | undefined = project.pages.find((p) => p.id === project.currentPageId)
  if (!page) return null

  const { width, height } = page.canvas
  const bg = pageBackground(page)
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
        />
      ))}
    </div>
  )
}

function RuntimeWidget({
  node,
  meta,
  dataSources,
}: {
  node: WidgetNode
  meta: WidgetMeta | undefined
  dataSources: Record<string, DataSource>
}) {
  if (node.flags.hidden) return null
  const { layout } = node

  // Build the resolved data the component reads. Same resolver the
  // designer uses, so runtime preview matches design-time exactly.
  const data = resolveWidgetData(node, meta, dataSources)

  return (
    <div
      className="absolute origin-center"
      style={{
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
        transform: `rotate(${layout.rotate}deg) scale(${layout.flipX ? -1 : 1}, ${layout.flipY ? -1 : 1})`,
        opacity: layout.opacity,
      }}
    >
      <WidgetView node={node} meta={meta} data={data} designMode={false} />
    </div>
  )
}

/** Translate the page's `Background` shape into CSS background properties. */
function pageBackground(page: Page): React.CSSProperties {
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
    case 'image':
    case 'transparent':
    default:
      return { background: 'transparent' }
  }
}
