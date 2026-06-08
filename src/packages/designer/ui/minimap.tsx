import * as React from 'react'
import { X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import type { Background } from '@schema/types'
import { rotatedAABB } from '../canvas/transformer/geometry'
import { useDashboardEditor, useDocumentState, useEditorState } from '../editor/editor-context'
import { useEditorStore } from '../stores/editor-store'
import { selectCurrentPage, selectWidgets } from '../stores/selectors'

/**
 * Bottom-right overview navigator (Figma / tldraw idiom). Renders the page
 * artboard scaled to fit a small box — using the page's *actual* background
 * so it reads as a true miniature — with one block per widget and a
 * "spotlight" over the region currently visible in the viewport (everything
 * outside it is dimmed, rather than drawing a plain outlined rectangle).
 *
 * Click / drag anywhere to re-centre the viewport on that point (pure pan,
 * scale untouched). Visibility is driven by `EditorStore.panels.minimap`
 * (toggled from FloatingZoom). Sits just above the zoom control.
 */
const MAX_W = 208
const MAX_H = 144

/** Page background → CSS for the minimap thumbnail. */
function miniBackground(bg: Background): React.CSSProperties {
  switch (bg.type) {
    case 'color':
      return { background: bg.color }
    case 'gradient': {
      const stops = bg.gradient.stops
        .map((s) => `${s.color} ${(s.offset * 100).toFixed(1)}%`)
        .join(', ')
      return {
        background:
          bg.gradient.type === 'linear'
            ? `linear-gradient(${bg.gradient.angle ?? 180}deg, ${stops})`
            : `radial-gradient(${stops})`,
      }
    }
    case 'image':
      return { background: '#0b1220' } // dark placeholder tint
    case 'transparent':
    default:
      return { background: 'var(--muted)' }
  }
}

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

  // Visible canvas region (canvas-space) → minimap-space, clamped to the
  // artboard so the spotlight stays tidy when panned past the edges.
  const hasCam = camera.scale > 0
  const vx = hasCam ? -camera.x / camera.scale : 0
  const vy = hasCam ? -camera.y / camera.scale : 0
  const vw = hasCam ? viewport.width / camera.scale : cw
  const vh = hasCam ? viewport.height / camera.scale : ch
  // Visible region in minimap space. Un-clamped — the panel clips overflow,
  // so a viewport panned past the artboard just shows the on-board part.
  const rectLeft = vx * scale
  const rectTop = vy * scale
  const rectW = vw * scale
  const rectH = vh * scale

  return (
    <div className="group border-border/70 bg-card/80 absolute right-4 bottom-16 z-20 overflow-hidden rounded-lg border shadow-lg ring-1 ring-black/5 backdrop-blur-sm select-none">
      <div
        ref={boxRef}
        className="relative cursor-pointer"
        style={{ width: boxW, height: boxH, ...miniBackground(canvas.background) }}
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
              className="bg-primary/55 pointer-events-none absolute rounded-[1px]"
              style={{
                left: r.x * scale,
                top: r.y * scale,
                width: Math.max(r.width * scale, 1.5),
                height: Math.max(r.height * scale, 1.5),
              }}
            />
          )
        })}

        {/* Viewport indicator — a light, crisp frame (white border + dark
            halo so it reads on any page background), not a heavy spotlight.
            Stays subtle whether the visible region is small (zoomed in) or
            covers most of the board (zoomed out). */}
        {hasCam && rectW > 1 && rectH > 1 && (
          <div
            className="pointer-events-none absolute rounded-[3px]"
            style={{
              left: rectLeft,
              top: rectTop,
              width: rectW,
              height: rectH,
              border: '1px solid rgba(255,255,255,0.92)',
              background: 'rgba(255,255,255,0.08)',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.30), 0 1px 3px rgba(0,0,0,0.30)',
            }}
          />
        )}
      </div>

      {/* Hover-revealed close — keeps the panel chrome-free until needed. */}
      <button
        type="button"
        aria-label="隐藏小地图"
        onClick={() => useEditorStore.getState().actions.setPanel('minimap', false)}
        className="absolute top-1 right-1 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded bg-black/35 text-white/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/60 hover:text-white"
      >
        <X size={12} />
      </button>
    </div>
  )
}
