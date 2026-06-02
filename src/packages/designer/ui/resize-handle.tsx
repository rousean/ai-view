import * as React from 'react'
import { cn } from '~/lib/utils'

/**
 * Thin draggable gutter for resizing a side panel. Emits the per-move
 * pointer delta (px) — the parent decides how to apply it (left dock adds,
 * right dock subtracts) and clamps. Sits on the panel's inner edge.
 *
 * Parents should read the current width from the store inside `onResize`
 * (not a captured value) so the resize stays cumulative across the drag.
 */
export function ResizeHandle({
  edge,
  onResize,
}: {
  edge: 'left' | 'right'
  onResize: (dx: number) => void
}) {
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    let lastX = e.clientX
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lastX
      lastX = ev.clientX
      if (dx !== 0) onResize(dx)
    }
    const onUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
      className={cn(
        'hover:bg-primary/30 absolute top-0 bottom-0 z-20 w-1.5 cursor-col-resize touch-none transition-colors',
        edge === 'right' ? 'right-0' : 'left-0',
      )}
    />
  )
}
