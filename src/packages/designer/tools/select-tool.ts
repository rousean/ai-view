import { MousePointer2 } from 'lucide-react'
import { rotatedAABB, unionBBox } from '../canvas/transformer/geometry'
import { buildSnapContext } from '../snap/build-context'
import { useSnapGuidesStore } from '../snap/snap-store'
import { useEditorStore } from '../stores/editor-store'
import type { Tool, ToolContext } from './tool.interface'

/** Read user-visible snap toggles from EditorStore.view. */
function shouldRunSnap(): boolean {
  const v = useEditorStore.getState().view
  return v.snapToElements || v.snapToGuides || v.snapToGrid
}

interface SelectState {
  phase: 'idle' | 'pre-move' | 'moving' | 'marquee' | 'pre-click'
  pointerStart?: { x: number; y: number }
  canvasStart?: { x: number; y: number }
  movingIds?: string[]
  /** Initial top-left positions of widgets being moved. */
  initialLayouts?: Map<string, { x: number; y: number }>
  /** Initial visual bbox (rotated AABB union) of the moving selection. */
  initialBBox?: { x: number; y: number; width: number; height: number }
  marqueeOrigin?: { x: number; y: number }
  hitWidgetId?: string
}

const MOVE_THRESHOLD = 4 // px in screen space

function getState(ctx: ToolContext): SelectState {
  return ctx.state as unknown as SelectState
}

function findHitWidgetId(target: EventTarget | null): string | null {
  let el = target as HTMLElement | null
  while (el && el !== document.body) {
    const id = el.dataset?.widgetId
    if (id) return id
    el = el.parentElement
  }
  return null
}

export const SelectTool: Tool = {
  type: 'select',
  label: '选择',
  shortcut: 'V',
  icon: MousePointer2 as Tool['icon'],

  onActivate(ctx) {
    Object.assign(ctx.state, { phase: 'idle' } satisfies SelectState)
  },

  onPointerDown(e, ctx) {
    const editor = ctx.editor
    const s = getState(ctx)
    const widgetId = findHitWidgetId(e.target)
    s.pointerStart = { x: e.clientX, y: e.clientY }
    s.canvasStart = ctx.pointer.canvas

    if (widgetId) {
      // Hit a widget — prepare to move it (and everything else selected).
      const isAlreadySelected = editor.getSelectedIds().includes(widgetId)
      if (!isAlreadySelected) {
        if (e.shiftKey || e.ctrlKey || e.metaKey)
          editor.selectOne(widgetId, { addToSelection: true })
        else editor.selectOne(widgetId)
      }
      s.hitWidgetId = widgetId
      s.phase = 'pre-move'
      const ids = editor.getSelectedIds()
      const initialLayouts = new Map<string, { x: number; y: number }>()
      const selectedWidgets = []
      for (const id of ids) {
        const w = editor.getWidget(id)
        if (w) {
          initialLayouts.set(id, { x: w.layout.x, y: w.layout.y })
          selectedWidgets.push(w)
        }
      }
      s.movingIds = ids
      s.initialLayouts = initialLayouts
      // Snapshot the visual bbox so snap targets stay stable for the
      // entire gesture (no jitter when intermediate positions snap on/off).
      s.initialBBox = unionBBox(selectedWidgets) ?? undefined
      editor.mark('Move widgets')
    } else {
      // Empty canvas click → marquee or clear selection.
      if (!(e.shiftKey || e.ctrlKey || e.metaKey)) editor.selectNone()
      s.phase = 'marquee'
      s.marqueeOrigin = ctx.pointer.canvas
    }

    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  },

  onPointerMove(e, ctx) {
    const editor = ctx.editor
    const s = getState(ctx)
    if (s.phase === 'idle') return

    if (s.phase === 'pre-move' || s.phase === 'moving') {
      if (!s.pointerStart) return
      const dx = e.clientX - s.pointerStart.x
      const dy = e.clientY - s.pointerStart.y
      if (s.phase === 'pre-move' && Math.hypot(dx, dy) < MOVE_THRESHOLD) {
        return
      }
      s.phase = 'moving'

      // Convert delta from screen → canvas.
      const scale = editor.getCamera().scale
      let cdx = dx / scale
      let cdy = dy / scale

      // ── Snap pass ──────────────────────────────────────────────
      // Alt held = bypass snap (free positioning). Also respects
      // EditorStore.view.snapTo* toggles. Defensive: skip entirely if
      // editor.snap is missing (e.g. stale HMR instance).
      if (!e.altKey && s.initialBBox && editor.snap && shouldRunSnap()) {
        try {
          const view = useEditorStore.getState().view
          // Sync per-axis toggles into the manager each call — cheap.
          editor.snap.configure({
            toElements: view.snapToElements,
            toGuides: view.snapToGuides,
            toCanvas: view.snapToElements,
            toGrid: view.snapToGrid,
          })
          const movedBBox = {
            x: s.initialBBox.x + cdx,
            y: s.initialBBox.y + cdy,
            width: s.initialBBox.width,
            height: s.initialBBox.height,
          }
          const snapCtx = buildSnapContext(editor, s.movingIds ?? [])
          const result = editor.snap.snap(
            movedBBox,
            {
              left: true,
              right: true,
              top: true,
              bottom: true,
              centerX: true,
              centerY: true,
            },
            snapCtx,
            scale,
          )
          cdx += result.delta.x
          cdy += result.delta.y
          useSnapGuidesStore.getState().set(result.guides)
        } catch (err) {
          console.warn('[snap] move snap failed', err)
          useSnapGuidesStore.getState().clear()
        }
      } else {
        useSnapGuidesStore.getState().clear()
      }

      const updates = (s.movingIds ?? []).map((id) => {
        const init = s.initialLayouts?.get(id)
        return {
          id,
          layout: {
            x: (init?.x ?? 0) + cdx,
            y: (init?.y ?? 0) + cdy,
          },
        }
      })
      editor.updateLayoutBatch(updates)
    } else if (s.phase === 'marquee') {
      if (!s.marqueeOrigin) return
      const a = s.marqueeOrigin
      const b = ctx.pointer.canvas
      const rect = {
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        width: Math.abs(b.x - a.x),
        height: Math.abs(b.y - a.y),
      }
      editor.bus.emit('plugin.marquee.update', rect)
    }
  },

  onPointerUp(_e, ctx) {
    const editor = ctx.editor
    const s = getState(ctx)
    if (s.phase === 'marquee') {
      // Commit selection from marquee.
      const a = s.marqueeOrigin
      const b = ctx.pointer.canvas
      if (a) {
        const rect = {
          x: Math.min(a.x, b.x),
          y: Math.min(a.y, b.y),
          width: Math.abs(b.x - a.x),
          height: Math.abs(b.y - a.y),
        }
        if (rect.width > 4 && rect.height > 4) {
          // Hit-test against the rotated AABB so rotated widgets are
          // selectable by the marquee that visually overlaps them.
          const hits = editor.getAllWidgets().filter((w) => {
            const aabb = rotatedAABB(w)
            return (
              aabb.x + aabb.width >= rect.x &&
              aabb.x <= rect.x + rect.width &&
              aabb.y + aabb.height >= rect.y &&
              aabb.y <= rect.y + rect.height
            )
          })
          editor.select(hits.map((w) => w.id))
        }
      }
      editor.bus.emit('plugin.marquee.update', null)
    }
    // Clear any active alignment guides at the end of every gesture.
    useSnapGuidesStore.getState().clear()
    Object.assign(ctx.state, { phase: 'idle' } satisfies SelectState)
  },

  onKeyDown(e, ctx) {
    const editor = ctx.editor
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const ids = editor.getSelectedIds()
      if (ids.length > 0) editor.removeWidgets(ids)
    } else if (e.key === 'Escape') {
      editor.selectNone()
    } else if (e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      editor.selectAll()
    }
  },
}
