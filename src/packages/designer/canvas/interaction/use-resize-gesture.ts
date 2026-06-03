import * as React from 'react'
import type { Layout, WidgetNode } from '@schema/types'
import type { WidgetMeta } from '@widgets/widget-meta'
import { useDashboardEditor } from '../../editor/editor-context'
import { buildSnapContext } from '../../snap/build-context'
import { useSizeMatchStore, type SizeMatchSegment } from '../../snap/size-match-store'
import { useSnapGuidesStore } from '../../snap/snap-store'
import { useEditorStore } from '../../stores/editor-store'
import {
  type BBox,
  type ResizeHandle,
  distributeResize,
  handleSides,
  resizeBBox,
  unionBBox,
} from '../transformer/geometry'

function shouldRunSnap(): boolean {
  const v = useEditorStore.getState().view
  return v.snapToElements || v.snapToGuides || v.snapToGrid
}

/** Nearest rect in `rects` whose `dim` is within `th` of `value`, or null. */
function nearestSizeRect(
  rects: BBox[],
  dim: 'width' | 'height',
  value: number,
  th: number,
): BBox | null {
  let best: BBox | null = null
  let bestD = th
  for (const r of rects) {
    const d = Math.abs(r[dim] - value)
    if (d <= bestD) {
      bestD = d
      best = r
    }
  }
  return best
}

interface ResizeSession {
  handle: ResizeHandle
  pointerStart: { x: number; y: number }
  startBBox: BBox
  initial: WidgetNode[]
  /**
   * Set only when the selection is a single rotated widget. Triggers
   * the rotation-aware code path in `onMove`. For all other cases
   * (axis-aligned single, or multi-select) it stays undefined and the
   * legacy distribute-by-AABB algorithm runs.
   */
  rotated?: {
    /** widget.layout.rotate, degrees. */
    angle: number
    /** Whether the widget is mirrored — the local frame is flipped too. */
    flipX: boolean
    flipY: boolean
    /** Anchor's screen-space position at gesture start — held fixed. */
    screenAnchor: { x: number; y: number }
    /** Starting layout snapshot (unrotated frame). */
    startLayout: Layout
  }
  /**
   * Per-widget resize bounds + aspect lock, read from the single
   * selected widget's `WidgetMeta.capabilities`. Undefined for
   * multi-select (mixed capabilities have no sensible union).
   */
  caps?: {
    minWidth: number
    minHeight: number
    maxWidth: number
    maxHeight: number
    forceAspect: boolean
  }
}

/**
 * The "anchor" (opposite corner / edge) of a resize handle, expressed
 * in the widget's local frame relative to its centre.
 *
 *   bottom-right handle → top-left anchor (-w/2, -h/2)
 *   right handle        → left edge        (-w/2,    0)
 *   top handle          → bottom edge      (   0, +h/2)
 *   etc.
 *
 * Used by the rotation-aware resize to keep the visually-fixed corner
 * (the one the user did not grab) glued to the screen while the
 * grabbed corner follows the pointer.
 */
function localAnchorOffset(handle: ResizeHandle, w: number, h: number) {
  const sides = handleSides(handle)
  const x = sides.movesLeft ? w / 2 : sides.movesRight ? -w / 2 : 0
  const y = sides.movesTop ? h / 2 : sides.movesBottom ? -h / 2 : 0
  return { x, y }
}

/**
 * Hook returning a `start(handle, pointerEvent)` function that begins a
 * resize gesture on the current selection. The gesture handles
 * pointer move / up internally and commits via editor.updateLayoutBatch.
 *
 * Shift = lock aspect ratio. Alt = scale from center.
 */
export function useResizeGesture(): (handle: ResizeHandle, e: React.PointerEvent) => void {
  const editor = useDashboardEditor()
  const sessionRef = React.useRef<ResizeSession | null>(null)

  const onMove = React.useCallback(
    (ev: PointerEvent) => {
      const s = sessionRef.current
      if (!s) return
      const scale = editor.getCamera().scale
      const screenDx = (ev.clientX - s.pointerStart.x) / scale
      const screenDy = (ev.clientY - s.pointerStart.y) / scale

      // Rotation-aware single-widget path. The legacy distribute-by-AABB
      // algorithm doesn't work here: it treats the widget's rotated AABB
      // as the start box and applies screen-space deltas, which produces
      // uniform scaling along widget-local axes (so dragging the "right"
      // edge inflates both width and height, and the anchor corner walks
      // off across the canvas).
      //
      // The fix:
      //   1. Rotate the pointer delta into the widget's local frame.
      //   2. Run resizeBBox in the local frame against the *unrotated*
      //      layout — same logic axis-aligned widgets use.
      //   3. Translate the new layout so the anchor corner (the one the
      //      user did NOT grab) stays at its original screen position.
      if (s.rotated) {
        const { angle, flipX, flipY, screenAnchor, startLayout } = s.rotated
        const rad = (angle * Math.PI) / 180
        const cosA = Math.cos(rad)
        const sinA = Math.sin(rad)
        // Invert the render transform R(angle)·S(flip) to map a screen
        // delta into the widget's unrotated, unflipped local frame:
        //   localDelta = S · R⁻¹ · screenDelta   (S is its own inverse)
        const fx = flipX ? -1 : 1
        const fy = flipY ? -1 : 1
        const localDx = fx * (screenDx * cosA + screenDy * sinA)
        const localDy = fy * (-screenDx * sinA + screenDy * cosA)

        // Resize the unrotated layout in the local frame.
        const newLocalBBox = resizeBBox(
          { x: 0, y: 0, width: startLayout.width, height: startLayout.height },
          s.handle,
          localDx,
          localDy,
          {
            lockAspect: ev.shiftKey || s.caps?.forceAspect,
            fromCenter: ev.altKey,
            minWidth: s.caps?.minWidth,
            minHeight: s.caps?.minHeight,
            maxWidth: s.caps?.maxWidth,
            maxHeight: s.caps?.maxHeight,
          },
        )

        // Anchor offset re-derived against the *new* size so the side
        // length that didn't move (in local frame) stays anchored to the
        // same screen point. Mirror it through S(flip) before R(angle) so
        // flipped widgets keep the correct (visually-fixed) corner pinned.
        const anchorLocal = localAnchorOffset(s.handle, newLocalBBox.width, newLocalBBox.height)
        const ax = anchorLocal.x * fx
        const ay = anchorLocal.y * fy
        // newCenter such that:  screenAnchor === newCenter + R(angle)·S(flip)·anchorLocal
        const newCenter = {
          x: screenAnchor.x - (ax * cosA - ay * sinA),
          y: screenAnchor.y - (ax * sinA + ay * cosA),
        }

        editor.updateLayout(s.initial[0]!.id, {
          x: newCenter.x - newLocalBBox.width / 2,
          y: newCenter.y - newLocalBBox.height / 2,
          width: newLocalBBox.width,
          height: newLocalBBox.height,
        })
        useSnapGuidesStore.getState().clear()
        useSizeMatchStore.getState().clear()
        return
      }

      const dx = screenDx
      const dy = screenDy
      const newBBox = resizeBBox(s.startBBox, s.handle, dx, dy, {
        // A multi-selection containing a rotated widget is forced to keep
        // aspect: a non-uniform scale can't be expressed on a rotated rect
        // without shearing (which widgets don't support), so it would drift.
        lockAspect:
          ev.shiftKey ||
          !!s.caps?.forceAspect ||
          (s.initial.length > 1 && s.initial.some((w) => w.layout.rotate !== 0)),
        fromCenter: ev.altKey,
        minWidth: s.caps?.minWidth,
        minHeight: s.caps?.minHeight,
        maxWidth: s.caps?.maxWidth,
        maxHeight: s.caps?.maxHeight,
      })

      // ── Snap the moving edges ────────────────────────────────────
      const sides = handleSides(s.handle)
      let snapped = newBBox
      if (!ev.altKey && editor.snap && shouldRunSnap()) {
        try {
          const view = useEditorStore.getState().view
          editor.snap.configure({
            toElements: view.snapToElements,
            toGuides: view.snapToGuides,
            toCanvas: view.snapToElements,
            toGrid: view.snapToGrid,
          })
          const ctx = buildSnapContext(
            editor,
            s.initial.map((w) => w.id),
          )
          const result = editor.snap.snap(
            newBBox,
            {
              left: sides.movesLeft,
              right: sides.movesRight,
              top: sides.movesTop,
              bottom: sides.movesBottom,
            },
            ctx,
            scale,
          )
          // Apply snap delta only to the side that's actually moving so
          // the anchored side stays put.
          snapped = { ...newBBox }
          if (result.delta.x !== 0) {
            if (sides.movesLeft) {
              snapped.x += result.delta.x
              snapped.width -= result.delta.x
            } else if (sides.movesRight) {
              snapped.width += result.delta.x
            }
          }
          if (result.delta.y !== 0) {
            if (sides.movesTop) {
              snapped.y += result.delta.y
              snapped.height -= result.delta.y
            } else if (sides.movesBottom) {
              snapped.height += result.delta.y
            }
          }

          // ── Size snap ──────────────────────────────────────────────
          // Single-widget resize: match the moving width/height to a
          // sibling's identical dimension (so cards/tiles share a size),
          // but only on an axis the position snap didn't already claim.
          // The anchored edge holds; the moving edge absorbs the change.
          //
          // Skipped while aspect is locked (Shift or a widget that pins its
          // ratio): changing one axis alone there would break the ratio.
          const aspectLocked = ev.shiftKey || !!s.caps?.forceAspect
          if (s.initial.length === 1 && view.snapToElements && !aspectLocked) {
            const sizeTh = 6 / scale
            let wT: BBox | null = null
            let hT: BBox | null = null
            if (result.delta.x === 0 && (sides.movesLeft || sides.movesRight)) {
              wT = nearestSizeRect(ctx.staticRects, 'width', snapped.width, sizeTh)
              if (wT) {
                if (sides.movesLeft) snapped.x -= wT.width - snapped.width
                snapped.width = wT.width
              }
            }
            if (result.delta.y === 0 && (sides.movesTop || sides.movesBottom)) {
              hT = nearestSizeRect(ctx.staticRects, 'height', snapped.height, sizeTh)
              if (hT) {
                if (sides.movesTop) snapped.y -= hT.height - snapped.height
                snapped.height = hT.height
              }
            }
            // Pink "equal size" markers: one bar on the moving widget, one
            // on the sibling it matched, per snapped axis.
            const segs: SizeMatchSegment[] = []
            if (wT) {
              const yA = snapped.y + snapped.height / 2
              segs.push({ orientation: 'h', x1: snapped.x, y1: yA, x2: snapped.x + snapped.width, y2: yA })
              const yB = wT.y + wT.height / 2
              segs.push({ orientation: 'h', x1: wT.x, y1: yB, x2: wT.x + wT.width, y2: yB })
            }
            if (hT) {
              const xA = snapped.x + snapped.width / 2
              segs.push({ orientation: 'v', x1: xA, y1: snapped.y, x2: xA, y2: snapped.y + snapped.height })
              const xB = hT.x + hT.width / 2
              segs.push({ orientation: 'v', x1: xB, y1: hT.y, x2: xB, y2: hT.y + hT.height })
            }
            useSizeMatchStore.getState().set(segs)
          } else {
            useSizeMatchStore.getState().clear()
          }

          useSnapGuidesStore.getState().set(result.guides)
        } catch (err) {
          console.warn('[snap] resize snap failed', err)
          useSnapGuidesStore.getState().clear()
          useSizeMatchStore.getState().clear()
        }
      } else {
        useSnapGuidesStore.getState().clear()
        useSizeMatchStore.getState().clear()
      }

      // Locked widgets ride along in the selection bbox (so the handles
      // still frame them) but must never be moved/resized by the gesture —
      // same invariant the move/nudge paths enforce.
      const lockedIds = new Set(s.initial.filter((w) => w.flags.locked).map((w) => w.id))
      const updates = distributeResize(s.initial, s.startBBox, snapped).filter(
        (u) => !lockedIds.has(u.id),
      )
      editor.updateLayoutBatch(updates as Array<{ id: string; layout: Partial<Layout> }>)
    },
    [editor],
  )

  const onUp = React.useCallback(() => {
    sessionRef.current = null
    useSnapGuidesStore.getState().clear()
    useSizeMatchStore.getState().clear()
    useEditorStore.getState().actions.setInteraction({ kind: 'idle' })
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
  }, [onMove])

  return React.useCallback(
    (handle: ResizeHandle, e: React.PointerEvent) => {
      const initial = editor.getSelectedWidgets()
      if (initial.length === 0) return
      const startBBox = unionBBox(initial)
      if (!startBBox) return

      // Detect the rotation-aware single-widget case.
      // Multi-select with mixed rotations is still handled by the AABB
      // algorithm — it's not perfect, but matches the chrome behaviour
      // (the multi-select chrome itself is axis-aligned at resize time)
      // and we'd rather under-promise than ship a buggy half-fix.
      const single = initial.length === 1 ? initial[0] : null

      // Single-selection only: honour the widget's declared resize bounds
      // + aspect lock. Multi-select keeps the legacy free-resize (mixed
      // capabilities have no sensible union).
      let caps: ResizeSession['caps']
      if (single) {
        const meta = editor.registry.widgets.get(single.type) as WidgetMeta | undefined
        const c = meta?.capabilities
        if (c) {
          caps = {
            minWidth: c.minSize?.width ?? 4,
            minHeight: c.minSize?.height ?? 4,
            maxWidth: c.maxSize?.width ?? Infinity,
            maxHeight: c.maxSize?.height ?? Infinity,
            forceAspect: c.aspectRatio != null,
          }
        }
      }
      const rotated =
        single && single.layout.rotate
          ? (() => {
              const layout = single.layout
              const cx = layout.x + layout.width / 2
              const cy = layout.y + layout.height / 2
              const off = localAnchorOffset(handle, layout.width, layout.height)
              const fx = layout.flipX ? -1 : 1
              const fy = layout.flipY ? -1 : 1
              const ox = off.x * fx
              const oy = off.y * fy
              const r = (layout.rotate * Math.PI) / 180
              const cosA = Math.cos(r)
              const sinA = Math.sin(r)
              return {
                angle: layout.rotate,
                flipX: layout.flipX,
                flipY: layout.flipY,
                startLayout: { ...layout },
                screenAnchor: {
                  x: cx + (ox * cosA - oy * sinA),
                  y: cy + (ox * sinA + oy * cosA),
                },
              }
            })()
          : undefined

      sessionRef.current = {
        handle,
        pointerStart: { x: e.clientX, y: e.clientY },
        startBBox,
        // Snapshot initial layouts; we re-derive from these every move.
        initial: initial.map((w) => structuredClone(w)),
        rotated,
        caps,
      }
      // Surface the gesture to EditorStore so HUD overlays can render
      // the right readout (W × H during resize).
      useEditorStore.getState().actions.setInteraction({
        kind: 'resizing',
        ids: initial.map((w) => w.id),
        handle,
      })
      // Mark a single history breakpoint at gesture start; subsequent
      // updateLayoutBatch calls coalesce via mergeKey.
      editor.mark('Resize widgets')

      // stop bubbling so SelectTool doesn't see this.
      e.stopPropagation()
      e.preventDefault()
      ;(e.target as Element).setPointerCapture?.(e.pointerId)

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    },
    [editor, onMove, onUp],
  )
}
