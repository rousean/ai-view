import * as React from 'react'
import type { Layout, Rect, WidgetNode } from '@schema/types'
import { useDashboardEditor } from '../../editor/editor-context'
import { useEditorStore } from '../../stores/editor-store'
import { bboxCenter, distributeRotation, unionBBox } from '../transformer/geometry'

interface RotateSession {
  pivot: { x: number; y: number }
  startAngle: number
  initial: WidgetNode[]
  /** Union AABB at gesture start; reused for chrome rendering each frame. */
  initialBBox: Rect
  /** Selected widget ids — captured here so onMove doesn't need to re-read. */
  ids: string[]
}

/** Returns degrees from pivot → point, with 0 = up. */
function angleFromPivot(pivot: { x: number; y: number }, p: { x: number; y: number }): number {
  // Math.atan2 returns radians from +x axis (right). Convert to "0 = up" CW.
  const a = Math.atan2(p.y - pivot.y, p.x - pivot.x) // radians, 0 = right, increases CCW down? In screen space y grows down so atan2 is CW.
  return (a * 180) / Math.PI + 90 // +90 so 0 corresponds to straight up
}

/**
 * Snap angle to nearest multiple if `step` is non-zero (Shift held).
 */
function snapAngle(deg: number, step: number): number {
  if (!step) return deg
  return Math.round(deg / step) * step
}

export function useRotateGesture(): (e: React.PointerEvent) => void {
  const editor = useDashboardEditor()
  const sessionRef = React.useRef<RotateSession | null>(null)
  const containerRectRef = React.useRef<DOMRect | null>(null)

  const screenToCanvas = React.useCallback(
    (sx: number, sy: number) => {
      const r = containerRectRef.current
      const left = r?.left ?? 0
      const top = r?.top ?? 0
      return editor.screenToCanvas({ x: sx, y: sy }, { left, top })
    },
    [editor],
  )

  const onMove = React.useCallback(
    (ev: PointerEvent) => {
      const s = sessionRef.current
      if (!s) return
      const cur = screenToCanvas(ev.clientX, ev.clientY)
      const curAngle = angleFromPivot(s.pivot, cur)
      let delta = curAngle - s.startAngle
      if (ev.shiftKey) delta = snapAngle(delta, 15)
      // Locked widgets stay put while the rest rotate around the shared
      // pivot — consistent with the move / resize / nudge gestures.
      const lockedIds = new Set(s.initial.filter((w) => w.flags.locked).map((w) => w.id))
      const updates = distributeRotation(s.initial, s.pivot, delta).filter(
        (u) => !lockedIds.has(u.id),
      )
      editor.updateLayoutBatch(updates as Array<{ id: string; layout: Partial<Layout> }>)
      // Publish the live delta so SelectionBounds can render the multi-
      // select chrome as a rigid rotation of `initialBBox` around the
      // pivot — instead of recomputing the AABB from the per-frame
      // widget positions (which wobbles, and drifts off-pivot for
      // asymmetric selections).
      useEditorStore.getState().actions.setInteraction({
        kind: 'rotating',
        ids: s.ids,
        pivot: s.pivot,
        initialBBox: s.initialBBox,
        delta,
      })
    },
    [editor, screenToCanvas],
  )

  const onUp = React.useCallback(() => {
    sessionRef.current = null
    containerRectRef.current = null
    useEditorStore.getState().actions.setInteraction({ kind: 'idle' })
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
  }, [onMove])

  return React.useCallback(
    (e: React.PointerEvent) => {
      const initial = editor.getSelectedWidgets()
      if (initial.length === 0) return
      const bbox = unionBBox(initial)
      if (!bbox) return
      const pivot = bboxCenter(bbox)

      // Cache the canvas viewport rect for screen→canvas conversions.
      // We walk up to find the .tl-canvas-viewport ancestor — fall back to
      // the closest positioned ancestor with `data-canvas-viewport`.
      const node = e.currentTarget as HTMLElement
      const viewport = node.closest('[data-canvas-viewport]') as HTMLElement | null
      containerRectRef.current = viewport?.getBoundingClientRect() ?? null

      const startPt = screenToCanvas(e.clientX, e.clientY)
      const startAngle = angleFromPivot(pivot, startPt)

      const ids = initial.map((w) => w.id)
      sessionRef.current = {
        pivot,
        startAngle,
        initial: initial.map((w) => structuredClone(w)),
        initialBBox: bbox,
        ids,
      }
      useEditorStore.getState().actions.setInteraction({
        kind: 'rotating',
        ids,
        pivot,
        initialBBox: bbox,
        delta: 0,
      })
      editor.mark('Rotate widgets')

      e.stopPropagation()
      e.preventDefault()
      ;(e.target as Element).setPointerCapture?.(e.pointerId)

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    },
    [editor, onMove, onUp, screenToCanvas],
  )
}
