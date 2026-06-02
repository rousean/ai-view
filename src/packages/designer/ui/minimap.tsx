import * as React from 'react'
import { X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '~/lib/utils'
import { rotatedAABB } from '../canvas/transformer/geometry'
import { useDashboardEditor, useDocumentState, useEditorState } from '../editor/editor-context'
import { useEditorStore } from '../stores/editor-store'
import { selectCurrentPage, selectWidgets } from '../stores/selectors'

/**
 * Bottom-right overview navigator. Renders the whole page artboard scaled
 * to fit a small box, with one rect per widget and a highlighted rectangle
 * for the part of the canvas currently visible in the viewport.
 *
 * Click (or drag) anywhere in the minimap to re-centre the viewport on that
 * point — the camera scale is left untouched, so it's a pure pan. Visibility
 * is driven by `EditorStore.panels.minimap` (toggled from FloatingZoom).
 *
 * Sits just above the zoom control (`bottom-16`) so the two stack without
 * overlapping.
 */
const MAX_W = 200
const MAX_H = 140

export function Minimap() {
  const editor = useDashboardEditor()
  const show = useEditorState((s) => s.panels.minimap)
  const camera = useEditorState((s) => s.camera)
  const viewport = useEditorState((s) => s.viewportSize)
  const canvas = useDocumentState((s) => selectCurrentPage(s)?.canvas ?? null)
  const widgets = useDocumentState(useShallow((s) => selectWidgets(s)))
  const boxRef = React.useRef<HTMLDivElement | null>(null)
  const draggingRef = React.useRef(false)

  // Re-centre the viewport on the canvas point under the minimap cursor.
  const centreOn = React.useCallback(
    (clientX: number, clientY: number, scale: number) => {
      const el = boxRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = (clientX - r.left) / scale
      const cy = (clientY - r.top) / scale
      const cam = editor.getCamera()
      const { width: vw, height: vh } = useEditorStore.getState().viewportSize
      if (vw <= 0 || vh <= 0) return
      editor.setCamera({ x: vw / 2 - cx * cam.scale, y: vh / 2 - cy * cam.scale })
    },
    [editor],
  )

  if (!show || !canvas) return null
  const cw = canvas.width
  const ch = canvas.height
  if (cw <= 0 || ch <= 0) return null

  const scale = Math.min(MAX_W / cw, MAX_H / ch)
  const boxW = cw * scale
  const boxH = ch * scale

  // Visible canvas region (canvas-space) → minimap-space rect.
  const hasCam = camera.scale > 0
  const vx = hasCam ? -camera.x / camera.scale : 0
  const vy = hasCam ? -camera.y / camera.scale : 0
  const vw = hasCam ? viewport.width / camera.scale : cw
  const vh = hasCam ? viewport.height / camera.scale : ch

  return (
    <div className="bg-card border-border absolute right-4 bottom-16 z-20 overflow-hidden rounded-md border shadow-md select-none">
      <div className="border-border flex items-center justify-between border-b px-2 py-0.5">
        <span className="text-muted-foreground/80 text-[10px] tracking-wide">导航</span>
        <button
          type="button"
          aria-label="隐藏小地图"
          onClick={() => useEditorStore.getState().actions.setPanel('minimap', false)}
          className="text-muted-foreground/60 hover:text-foreground flex h-4 w-4 cursor-pointer items-center justify-center rounded-sm"
        >
          <X size={11} />
        </button>
      </div>
      <div
        ref={boxRef}
        className="bg-muted/40 relative cursor-pointer"
        style={{ width: boxW, height: boxH }}
        onPointerDown={(e) => {
          draggingRef.current = true
          e.currentTarget.setPointerCapture?.(e.pointerId)
          centreOn(e.clientX, e.clientY, scale)
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) centreOn(e.clientX, e.clientY, scale)
        }}
        onPointerUp={(e) => {
          draggingRef.current = false
          e.currentTarget.releasePointerCapture?.(e.pointerId)
        }}
      >
        {widgets.map((wd) => {
          if (wd.flags.hidden) return null
          const r = rotatedAABB(wd)
          return (
            <div
              key={wd.id}
              className="bg-primary/45 pointer-events-none absolute rounded-[1px]"
              style={{
                left: r.x * scale,
                top: r.y * scale,
                width: Math.max(r.width * scale, 1),
                height: Math.max(r.height * scale, 1),
              }}
            />
          )
        })}
        {/* Viewport rectangle — what's currently on screen. */}
        <div
          className={cn(
            'border-primary bg-primary/10 pointer-events-none absolute',
          )}
          style={{
            left: vx * scale,
            top: vy * scale,
            width: vw * scale,
            height: vh * scale,
            borderWidth: 1,
          }}
        />
      </div>
    </div>
  )
}
