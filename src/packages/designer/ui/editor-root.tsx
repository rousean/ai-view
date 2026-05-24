import * as React from 'react'
import { DragDropProvider, type DragEndEvent, type DragStartEvent } from '@dnd-kit/react'
import { builtinWidgets, type WidgetMeta } from '@widgets/index'
import {
  LocalStoragePersistence,
  createEmptyProject,
  type PersistenceAdapter,
  type Project,
} from '@schema/index'
import { TooltipProvider } from '~/components/ui/tooltip'
import { CanvasContextMenu } from '../canvas/canvas-context-menu'
import { CanvasViewport } from '../canvas/canvas-viewport'
import { DashboardEditor } from '../editor/dashboard-editor'
import { EditorProvider } from '../editor/editor-context'
import { registerBuiltinSetters } from '../setters'
import { registerBuiltinTools } from '../tools'
import { FloatingTools } from './floating-tools'
import { FloatingZoom } from './floating-zoom'
import { IconRail, type RailKey } from './icon-rail'
import { MaterialsPanel } from './materials-panel'
import { PagesTabBar } from './pages-tab-bar'
import { PropertyPanel } from './property-panel'
import {
  AssetsPanel,
  DataSourcesPanel,
  HistoryPanel,
  LayersPanel,
  SecondaryPanel,
} from './secondary-panels'
import { TopBar } from './top-bar'

interface EditorRootProps {
  /** Persistence adapter. Defaults to LocalStoragePersistence. */
  adapter?: PersistenceAdapter
  /** Project id to load. If omitted, creates a brand-new project in memory. */
  projectId?: string
  className?: string
}

/**
 * Convenience root — instantiates a DashboardEditor with built-in widgets,
 * setters, and tools registered, then renders the Figma-style layout
 * (variant B): TopBar / [IconRail · SecondaryPanel · Canvas · PropertyPanel].
 *
 * The canvas keeps the existing ruler + grid implementation; floating tool
 * palette + zoom controls are overlayed on top per the design handoff.
 */
export const EditorRoot: React.FC<EditorRootProps> = ({ adapter, projectId, className }) => {
  const [editor, setEditor] = React.useState<DashboardEditor | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Pickup offset inside the source card — measured at dragStart, applied
  // at dragEnd. Hooks must run on every render path.
  const pickupOffsetRef = React.useRef({ x: 0, y: 0 })

  // Active secondary panel (variant B). `mat` = materials by default.
  const [rail, setRail] = React.useState<RailKey>('mat')

  React.useEffect(() => {
    let cancelled = false
    const _adapter = adapter ?? new LocalStoragePersistence()
    const ed = new DashboardEditor({ adapter: _adapter })

    for (const meta of builtinWidgets) {
      ed.registry.widgets.register(meta as unknown as { type: string })
    }
    registerBuiltinSetters(ed.registry.setters)
    registerBuiltinTools(ed.registry.tools)

    void (async () => {
      try {
        if (projectId) {
          await ed.load(projectId)
        } else {
          const project: Project = createEmptyProject({ name: '新建大屏' })
          await ed.loadFromProject(project)
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
        return
      }
      if (!cancelled) setEditor(ed)
    })()

    return () => {
      cancelled = true
      void ed.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        加载失败：{error}
      </div>
    )
  }
  if (!editor) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        正在初始化设计器…
      </div>
    )
  }

  // Matches the legacy editor: the widget's top-left ends up exactly where
  // the Feedback clone's top-left was when released, so there's no visible
  // jump between the drop visual and the spawned widget.
  const handleDragStart = (event: DragStartEvent) => {
    const { source, position } = event.operation
    if (!source?.element) return
    const { left, top } = source.element.getBoundingClientRect()
    pickupOffsetRef.current = {
      x: position.current.x - left,
      y: position.current.y - top,
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { source, target, position } = event.operation
    if (!source || !target || source.type !== 'materials' || target.id !== 'canvas') {
      return
    }
    const viewportEl = target.element as HTMLElement | null
    if (!viewportEl) return

    const meta = source.data as WidgetMeta
    const size = meta.defaultLayout
    const rect = viewportEl.getBoundingClientRect()

    const offset = pickupOffsetRef.current
    const cloneTopLeft = editor.screenToCanvas(
      {
        x: position.current.x - offset.x,
        y: position.current.y - offset.y,
      },
      { left: rect.left, top: rect.top },
    )

    const page = editor.getCurrentPage()
    const cw = page?.canvas.width ?? size.width
    const ch = page?.canvas.height ?? size.height
    const x = Math.max(0, Math.min(cw - size.width, cloneTopLeft.x))
    const y = Math.max(0, Math.min(ch - size.height, cloneTopLeft.y))

    editor.addWidget(meta.type, {
      position: { x, y },
      size,
      props: meta.defaultProps as Record<string, unknown>,
    })
  }

  return (
    <EditorProvider editor={editor}>
      <div
        className={`flex h-full w-full flex-col overflow-hidden bg-muted font-sans text-xs leading-tight text-foreground antialiased ${className ?? ''}`}
      >
        <TooltipProvider delayDuration={300}>
          <TopBar />
          <DragDropProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex min-h-0 flex-1">
              <IconRail active={rail} onChange={setRail} />
              {rail === 'mat' && <MaterialsPanel />}
              {rail === 'layers' && (
                <SecondaryPanel title="图层">
                  <LayersPanel />
                </SecondaryPanel>
              )}
              {rail === 'data' && (
                <SecondaryPanel title="数据源">
                  <DataSourcesPanel />
                </SecondaryPanel>
              )}
              {rail === 'assets' && (
                <SecondaryPanel title="资源库">
                  <AssetsPanel />
                </SecondaryPanel>
              )}
              {rail === 'history' && (
                <SecondaryPanel title="历史版本">
                  <HistoryPanel />
                </SecondaryPanel>
              )}
              <main className="relative flex min-w-0 flex-1 flex-col">
                <div className="relative min-h-0 flex-1">
                  {/*
                    Only the viewport is wrapped — floating tools / zoom
                    stay outside so right-clicking those still gets the
                    native context menu (and doesn't trigger the canvas
                    menu via event bubbling).
                  */}
                  <CanvasContextMenu>
                    <CanvasViewport />
                  </CanvasContextMenu>
                  <FloatingTools />
                  <FloatingZoom />
                </div>
                <PagesTabBar />
              </main>
              <PropertyPanel />
            </div>
          </DragDropProvider>
        </TooltipProvider>
      </div>
    </EditorProvider>
  )
}
