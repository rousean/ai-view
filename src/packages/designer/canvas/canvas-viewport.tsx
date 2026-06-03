import * as React from 'react'
import { useDroppable } from '@dnd-kit/react'
import { cn } from '~/lib/utils'
import { useDashboardEditor, useEditorState } from '../editor/editor-context'
import { runShortcut, shouldSkipKeydown } from '../editor/keyboard-shortcuts'
import { useEditorStore } from '../stores/editor-store'
import type { Tool, ToolContext } from '../tools/tool.interface'
import { CameraTransformLayer } from './camera-transform-layer'
import { ColumnGridOverlay } from './column-grid-overlay'
import { GridLayer } from './grid-layer'
import { SafeAreaOverlay } from './safe-area-overlay'
import { CanvasEmptyState } from './empty-state'
import { GuidesOverlay } from './guides-overlay'
import { useCreateGuideGesture } from './interaction/use-create-guide-gesture'
import { AlignmentGuidesOverlay } from './overlay/alignment-guides'
import { DistanceGuides } from './overlay/distance-guides'
import { MarqueeOverlay } from './overlay/marquee'
import { HoverIndicator, SelectionBounds } from './overlay/selection-bounds'
import { SizeMatchGuides } from './overlay/size-match-guides'
import { PageBackgroundWithAssets } from './page-background'
import { AxisX, AxisY, RULER_SIZE } from './ruler'
import { SelectionToolbar } from './selection-toolbar'
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

  /**
   * Transient pan state — viewport-owned (not the active tool), driven
   * by Space-hold or middle-button drag. Keeps SelectTool intact so the
   * user pops out of the pan and resumes selecting with no extra clicks.
   */
  const panRef = React.useRef<{
    startScreen: { x: number; y: number }
    startCamera: { x: number; y: number }
  } | null>(null)
  // Mirror of `panRef.current !== null` exposed as state so the cursor
  // can be driven from render without breaking the React refs rule.
  const [isPanning, setIsPanning] = React.useState(false)
  const [spaceHeld, setSpaceHeld] = React.useState(false)

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
    (e: PointerEvent | WheelEvent | KeyboardEvent | MouseEvent): ToolContext | null => {
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

  const startTransientPan = (e: React.PointerEvent) => {
    const cam = editor.getCamera()
    setIsPanning(true)
    panRef.current = {
      startScreen: { x: e.clientX, y: e.clientY },
      startCamera: { x: cam.x, y: cam.y },
    }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    // Transient pan — middle-mouse OR Space-held, regardless of active
    // tool. Bypass tool dispatch entirely so we don't pollute its state.
    if (e.button === 1 || spaceHeld) {
      e.preventDefault()
      startTransientPan(e)
      return
    }
    const t = getActiveTool()
    if (!t?.onPointerDown) return
    const ctx = getToolContext(e.nativeEvent)
    if (ctx) t.onPointerDown(e.nativeEvent, ctx)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    // Always publish the pointer's canvas-space position so facades
    // like `pasteFromClipboard` can drop content under the cursor.
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const canvas = editor.screenToCanvas(
        { x: e.clientX, y: e.clientY },
        { left: rect.left, top: rect.top },
      )
      useEditorStore.getState().actions.setMouseCanvasPos(canvas)
    }

    // Mid-pan: just translate the camera, skip tool dispatch.
    if (panRef.current) {
      const { startScreen, startCamera } = panRef.current
      const dx = e.clientX - startScreen.x
      const dy = e.clientY - startScreen.y
      editor.setCamera({ x: startCamera.x + dx, y: startCamera.y + dy })
      return
    }

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
    if (panRef.current) {
      panRef.current = null
      setIsPanning(false)
      return
    }
    const t = getActiveTool()
    if (!t?.onPointerUp) return
    const ctx = getToolContext(e.nativeEvent)
    if (ctx) t.onPointerUp(e.nativeEvent, ctx)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    const t = getActiveTool()
    if (!t?.onDoubleClick) return
    const ctx = getToolContext(e.nativeEvent)
    if (ctx) t.onDoubleClick(e.nativeEvent, ctx)
  }

  // Wheel handling lives in a NON-passive native listener (below) rather
  // than React's synthetic `onWheel`: React registers wheel listeners as
  // passive, so `preventDefault()` there is silently ignored and the
  // browser's native Ctrl/⌘-wheel page-zoom fires alongside our canvas
  // zoom. A manually-attached `{ passive: false }` listener lets us
  // actually suppress it.
  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect()
        const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        editor.zoomBy(-e.deltaY * 0.002, anchor)
      } else {
        editor.panBy(-e.deltaX, -e.deltaY)
      }
      const t = getActiveTool()
      if (t?.onWheel) {
        const ctx = getToolContext(e)
        if (ctx) t.onWheel(e, ctx)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [editor, getActiveTool, getToolContext])

  // Publish viewport size to EditorStore so facades like `fitToScreen`
  // can scale content to actual on-screen room. Reads stay in canvas-
  // space, so DashboardEditor never needs to touch the DOM directly.
  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const publish = () => {
      const rect = el.getBoundingClientRect()
      useEditorStore
        .getState()
        .actions.setViewportSize({ width: rect.width, height: rect.height })
    }
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keyboard events
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldSkipKeydown(e)) return

      // Space (held) = temporary pan tool. Once down, the next pointer
      // press routes through `startTransientPan` instead of the active
      // tool. We swallow the keypress so the page doesn't scroll.
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setSpaceHeld(true)
        return
      }

      // 1. Active tool gets first dibs.
      const t = getActiveTool()
      if (t?.onKeyDown) {
        const ctx = getToolContext(e)
        if (ctx) t.onKeyDown(e, ctx)
        if (e.defaultPrevented) return
      }
      // 2. Global shortcuts.
      runShortcut(e, editor)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpaceHeld(false)
        return
      }
      if (shouldSkipKeydown(e)) return
      const t = getActiveTool()
      if (!t?.onKeyUp) return
      const ctx = getToolContext(e)
      if (ctx) t.onKeyUp(e, ctx)
    }
    // Window blur clears the transient-pan key. Without it, holding
    // Space then Alt+Tab-ing away (releasing Space in another window)
    // strands `spaceHeld = true`: the cursor stays "grab" and the next
    // click pans instead of selecting, with no obvious way out.
    const onBlur = () => setSpaceHeld(false)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [editor, getActiveTool, getToolContext])

  const rulerOffset = showRulers ? RULER_SIZE : 0

  return (
    <div
      className={cn('text-primary relative h-full w-full', className)}
    >
      {/* Viewport — fills the frame, reserves space for rulers via inset.
          Cursor priority: mid-pan (grabbing) > space-held (grab) > active
          tool's own cursor. */}
      <div
        ref={setContainerRef}
        data-canvas-viewport
        className="absolute right-0 bottom-0 touch-none overflow-hidden"
        style={{
          top: rulerOffset,
          left: rulerOffset,
          cursor: isPanning
            ? 'grabbing'
            : spaceHeld
              ? 'grab'
              : (getActiveTool()?.cursor as string | undefined),
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <CameraTransformLayer>
          <PageBackgroundWithAssets />
          <GridLayer />
          <ColumnGridOverlay />
          <WidgetLayer />
          <HoverIndicator />
          <SelectionBounds />
          <AlignmentGuidesOverlay />
          <SizeMatchGuides />
          <DistanceGuides />
          <SafeAreaOverlay />
          <GuidesOverlay viewportRef={containerRef} />
          <MarqueeOverlay />
        </CameraTransformLayer>
        {/* Empty-state card lives OUTSIDE the camera-transform so it
            tracks the viewport (the user's actual visible area) instead
            of the artboard geometry — otherwise it drifts off-screen
            on a 1920×1080 canvas viewed through a 1280px editor. */}
        <CanvasEmptyState />
        {/* Selection quick-actions — viewport-relative, constant size,
            tracks the selection. Sits outside the camera transform. */}
        <SelectionToolbar />
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
              // Primary button only — right/middle clicks fall through to
              // the context menu / pan instead of spawning a guide.
              if (e.button !== 0) return
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
            onDoubleClick={(e) => {
              // Double-click the ruler → drop a guide at the clicked
              // coordinate (precise, no drag needed).
              const rect = containerRef.current?.getBoundingClientRect()
              if (!rect) return
              const c = editor.screenToCanvas(
                { x: e.clientX, y: e.clientY },
                { left: rect.left, top: rect.top },
              )
              editor.addGuide('vertical', Math.round(c.x))
            }}
          />
          <AxisY
            className="absolute bottom-0 left-0"
            style={{ top: RULER_SIZE, width: RULER_SIZE }}
            onStartGuide={(e) => {
              // Primary button only — right/middle clicks fall through to
              // the context menu / pan instead of spawning a guide.
              if (e.button !== 0) return
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
            onDoubleClick={(e) => {
              const rect = containerRef.current?.getBoundingClientRect()
              if (!rect) return
              const c = editor.screenToCanvas(
                { x: e.clientX, y: e.clientY },
                { left: rect.left, top: rect.top },
              )
              editor.addGuide('horizontal', Math.round(c.y))
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
