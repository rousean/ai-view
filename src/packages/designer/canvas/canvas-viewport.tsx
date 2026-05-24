import * as React from 'react'
import { useDroppable } from '@dnd-kit/react'
import { cn } from '~/lib/utils'
import { useDashboardEditor, useEditorState } from '../editor/editor-context'
import { runShortcut } from '../editor/keyboard-shortcuts'
import type { Tool, ToolContext } from '../tools/tool.interface'
import { CameraTransformLayer } from './camera-transform-layer'
import { GridLayer } from './grid-layer'
import { GuidesOverlay } from './guides-overlay'
import { useCreateGuideGesture } from './interaction/use-create-guide-gesture'
import { AlignmentGuidesOverlay } from './overlay/alignment-guides'
import { MarqueeOverlay } from './overlay/marquee'
import { HoverIndicator, SelectionBounds } from './overlay/selection-bounds'
import { PageBackgroundWithAssets } from './page-background'
import { AxisX, AxisY, RULER_SIZE } from './ruler'
import { WidgetLayer } from './widget-layer'

/**
 * Top-level canvas component. Captures pointer/wheel/keyboard events,
 * resolves the current tool from the registry, and dispatches to it.
 *
 * Layout: the outer frame is a single positioned container. The viewport
 * is an absolutely-positioned child that fills the frame, optionally
 * inset by RULER_SIZE on the top and left when rulers are visible.
 * Rulers are also absolute and self-measuring.
 *
 * This avoids:
 *   - lifting viewportSize state into the viewport (rulers measure
 *     themselves);
 *   - DOM restructuring when showRulers toggles (only CSS inset changes);
 *   - re-render fan-out from a single ResizeObserver in a parent.
 *
 * `data-canvas-viewport` stays on the inner viewport div — useRotateGesture
 * uses it as the screen→canvas conversion anchor.
 */
export const CanvasViewport: React.FC<{ className?: string }> = ({ className }) => {
  const editor = useDashboardEditor()
  const tool = useEditorState((s) => s.tool)
  const showRulers = useEditorState((s) => s.view.showRulers)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const { start: startGuide } = useCreateGuideGesture(containerRef)

  // Register the inner viewport div as a drop target for material drags
  // from the left panel. The actual drop handler lives in EditorRoot;
  // we only need to declare ourselves a target here.
  const { ref: dropRef } = useDroppable({ id: 'canvas' })

  // Combine our own ref + the dnd-kit ref into one callback so the same
  // <div> hosts both pointer events and droppable detection.
  const setContainerRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      containerRef.current = el
      if (typeof dropRef === 'function') (dropRef as (el: HTMLElement | null) => void)(el)
    },
    [dropRef],
  )

  // Per-tool persistent scratch state, keyed by tool id.
  const toolStatesRef = React.useRef<Map<string, Record<string, unknown>>>(new Map())

  const getToolContext = React.useCallback(
    (e: PointerEvent | WheelEvent | KeyboardEvent): ToolContext | null => {
      const rect = containerRef.current?.getBoundingClientRect()
      const screen = 'clientX' in e ? { x: e.clientX, y: e.clientY } : { x: 0, y: 0 }
      const canvas = editor.screenToCanvas(screen, {
        left: rect?.left ?? 0,
        top: rect?.top ?? 0,
      })
      let toolState = toolStatesRef.current.get(tool)
      if (!toolState) {
        toolState = {}
        toolStatesRef.current.set(tool, toolState)
      }
      return {
        editor,
        state: toolState,
        pointer: { screen, canvas },
      }
    },
    [editor, tool],
  )

  const getActiveTool = React.useCallback((): Tool | undefined => {
    return editor.registry.tools.get(tool)
  }, [editor, tool])

  // Activate / deactivate tools when the active id changes.
  const prevToolRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    const prevId = prevToolRef.current
    if (prevId && prevId !== tool) {
      const prev = editor.registry.tools.get(prevId)
      const prevState = toolStatesRef.current.get(prevId)
      if (prev?.onDeactivate && prevState) {
        prev.onDeactivate({
          editor,
          state: prevState,
          pointer: { screen: { x: 0, y: 0 }, canvas: { x: 0, y: 0 } },
        })
      }
    }
    const cur = editor.registry.tools.get(tool)
    let curState = toolStatesRef.current.get(tool)
    if (!curState) {
      curState = {}
      toolStatesRef.current.set(tool, curState)
    }
    if (cur?.onActivate) {
      cur.onActivate({
        editor,
        state: curState,
        pointer: { screen: { x: 0, y: 0 }, canvas: { x: 0, y: 0 } },
      })
    }
    prevToolRef.current = tool
  }, [editor, tool])

  // ── Event handlers ─────────────────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent) => {
    const t = getActiveTool()
    if (!t?.onPointerDown) return
    const ctx = getToolContext(e.nativeEvent)
    if (ctx) t.onPointerDown(e.nativeEvent, ctx)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    // Hover detection
    const targetEl = e.target as HTMLElement
    let el: HTMLElement | null = targetEl
    let hitId: string | null = null
    while (el && el !== containerRef.current) {
      const id = el.dataset?.widgetId
      if (id) {
        hitId = id
        break
      }
      el = el.parentElement
    }
    editor.setHover(hitId)

    const t = getActiveTool()
    if (!t?.onPointerMove) return
    const ctx = getToolContext(e.nativeEvent)
    if (ctx) t.onPointerMove(e.nativeEvent, ctx)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    const t = getActiveTool()
    if (!t?.onPointerUp) return
    const ctx = getToolContext(e.nativeEvent)
    if (ctx) t.onPointerUp(e.nativeEvent, ctx)
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const rect = containerRef.current?.getBoundingClientRect()
      const anchor = {
        x: e.clientX - (rect?.left ?? 0),
        y: e.clientY - (rect?.top ?? 0),
      }
      editor.zoomBy(-e.deltaY * 0.002, anchor)
    } else {
      editor.panBy(-e.deltaX, -e.deltaY)
    }
    const t = getActiveTool()
    if (t?.onWheel) {
      const ctx = getToolContext(e.nativeEvent)
      if (ctx) t.onWheel(e.nativeEvent, ctx)
    }
  }

  // Keyboard events
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // 1. Active tool gets first dibs — a tool can fully consume an
      //    event (it should call e.preventDefault() if so) and block
      //    the global shortcut dispatcher.
      const t = getActiveTool()
      if (t?.onKeyDown) {
        const ctx = getToolContext(e)
        if (ctx) t.onKeyDown(e, ctx)
        if (e.defaultPrevented) return
      }
      // 2. Global shortcuts — undo/redo/select/delete/zoom/toggles/…
      runShortcut(e, editor)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const t = getActiveTool()
      if (!t?.onKeyUp) return
      const ctx = getToolContext(e)
      if (ctx) t.onKeyUp(e, ctx)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [editor, getActiveTool, getToolContext])

  const rulerOffset = showRulers ? RULER_SIZE : 0

  return (
    <div
      className={cn('text-primary relative h-full w-full', className)}
    >
      {/* Viewport — fills the frame, reserves space for rulers via inset */}
      <div
        ref={setContainerRef}
        data-canvas-viewport
        className="absolute right-0 bottom-0 touch-none overflow-hidden"
        style={{
          top: rulerOffset,
          left: rulerOffset,
          cursor: getActiveTool()?.cursor as string | undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        <CameraTransformLayer>
          <PageBackgroundWithAssets />
          <GridLayer />
          <WidgetLayer />
          <HoverIndicator />
          <SelectionBounds />
          <AlignmentGuidesOverlay />
          <GuidesOverlay viewportRef={containerRef} />
          <MarqueeOverlay />
        </CameraTransformLayer>
      </div>

      {/* Rulers — absolute overlay; self-measuring. Drag-from-ruler
          spawns a guide via the gesture hook below; pointer events on
          the rulers themselves are intentionally enabled (their inner
          SVG sets pointer-events:none so only the bare div catches the
          pointer-down — keeping hit detection cheap). */}
      {showRulers && (
        <>
          <AxisX
            className="absolute top-0 right-0"
            style={{ left: RULER_SIZE, height: RULER_SIZE }}
            onStartGuide={(e) => {
              const rect = containerRef.current?.getBoundingClientRect()
              if (!rect) return
              e.preventDefault()
              startGuide({
                orientation: 'vertical', // top ruler → vertical guide
                clientX: e.clientX,
                clientY: e.clientY,
                viewportRect: rect,
              })
            }}
          />
          <AxisY
            className="absolute bottom-0 left-0"
            style={{ top: RULER_SIZE, width: RULER_SIZE }}
            onStartGuide={(e) => {
              const rect = containerRef.current?.getBoundingClientRect()
              if (!rect) return
              e.preventDefault()
              startGuide({
                orientation: 'horizontal', // left ruler → horizontal guide
                clientX: e.clientX,
                clientY: e.clientY,
                viewportRect: rect,
              })
            }}
          />
          {/* Top-left corner */}
          <div
            className="pointer-events-none absolute top-0 left-0"
            style={{ width: RULER_SIZE, height: RULER_SIZE }}
          />
        </>
      )}
    </div>
  )
}
