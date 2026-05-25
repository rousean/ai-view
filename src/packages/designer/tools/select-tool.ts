import { MousePointer2 } from 'lucide-react'
import type { WidgetNode } from '@schema/types'
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
  /**
   * Whether Alt was held at pointer-down. We don't act on it until the
   * pointer actually starts dragging (Alt+down with no move = pierce-
   * select; Alt+drag = duplicate-then-move).
   */
  altOnDown?: boolean
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

/**
 * Walk the DOM under the cursor and collect every widget id stacked at
 * the click point (top-most first). Used for Alt-click "pierce" so the
 * user can cycle through widgets layered on top of each other.
 *
 * `elementsFromPoint` returns every element under the point regardless
 * of stacking — we map each to its nearest `[data-widget-id]` ancestor
 * and dedupe, preserving order.
 */
function findStackedWidgetIds(clientX: number, clientY: number): string[] {
  if (typeof document === 'undefined') return []
  const seen = new Set<string>()
  const out: string[] = []
  const elements = document.elementsFromPoint(clientX, clientY) as HTMLElement[]
  for (const el of elements) {
    const host = el.closest?.('[data-widget-id]') as HTMLElement | null
    if (!host) continue
    const id = host.dataset.widgetId
    if (id && !seen.has(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  return out
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
    // Hit detection.
    //   - Plain click → top-most widget under the cursor.
    //   - Alt + click → pierce through to the next widget below the
    //     current selection (or the bottom-most if nothing's selected).
    //     Repeated Alt-clicks cycle through the stack. This is what
    //     Figma calls "select layer below".
    //
    // Alt also doubles as "duplicate-drag" once a widget is hit (see
    // below). The two behaviours don't conflict: pierce picks the
    // target; duplicate then clones that target before move starts.
    let widgetId = findHitWidgetId(e.target)
    if (e.altKey) {
      const stack = findStackedWidgetIds(e.clientX, e.clientY)
      if (stack.length > 1) {
        const selected = new Set(editor.getSelectedIds())
        const next = stack.find((id) => !selected.has(id))
        if (next) widgetId = next
      }
    }
    s.pointerStart = { x: e.clientX, y: e.clientY }
    s.canvasStart = ctx.pointer.canvas

    if (widgetId) {
      // Hit a widget — prepare to move it (and everything else selected).
      //
      // Group expansion rules:
      //   - Hitting a widget with `groupId` normally selects the whole
      //     group, so the group behaves like a single unit.
      //   - EXCEPT when we're in "isolated group" mode (entered via
      //     double-click on a group member): inside the isolated group
      //     we treat each click as a single-widget selection, so the
      //     user can move members individually without exiting.
      //   - Clicking a widget OUTSIDE the isolated group exits isolation
      //     and falls back to the normal whole-group rule.
      const hit = editor.getWidget(widgetId)
      const groupId = hit?.groupId
      const isolatedGroupId = editor.getIsolatedGroupId()
      const inIsolatedGroup = isolatedGroupId !== null && groupId === isolatedGroupId

      let nextIds: string[]
      if (inIsolatedGroup) {
        nextIds = [widgetId]
      } else {
        // Stepping out of (or never in) the isolated group: clear it.
        if (isolatedGroupId !== null) editor.setIsolatedGroup(null)
        nextIds = groupId
          ? editor
              .getAllWidgets()
              .filter((w) => w.groupId === groupId)
              .map((w) => w.id)
          : [widgetId]
      }

      const isAlreadySelected = editor.getSelectedIds().includes(widgetId)
      if (!isAlreadySelected) {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          // Additive: union the new ids into the existing selection.
          const next = new Set(editor.getSelectedIds())
          for (const id of nextIds) next.add(id)
          editor.select([...next])
        } else {
          editor.select(nextIds)
        }
      }

      // NB: Alt-drag duplication used to fire here, but that turns every
      // Alt+click into a stealth copy (even when the user only wanted to
      // pierce-select the layer below). Delay the duplicate until the
      // pointer actually crosses the move threshold — see onPointerMove.
      s.altOnDown = e.altKey

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
      // Empty canvas click → marquee or clear selection. Also exits
      // isolated-group mode if we were in one.
      if (!(e.shiftKey || e.ctrlKey || e.metaKey)) {
        editor.selectNone()
        if (editor.getIsolatedGroupId() !== null) editor.setIsolatedGroup(null)
      }
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
      if (s.phase !== 'moving') {
        // Crossed the move threshold.
        // (a) If Alt was held at pointer-down, this is alt-drag
        //     duplicate. Clone the selection in place, then re-snapshot
        //     initialLayouts / initialBBox against the clones so the
        //     drag (and snap) acts on the new copies, leaving the
        //     originals untouched.
        if (s.altOnDown) {
          editor.duplicateSelection({ offset: { x: 0, y: 0 } })
          const newIds = editor.getSelectedIds()
          s.movingIds = newIds
          const newLayouts = new Map<string, { x: number; y: number }>()
          const newWidgets: WidgetNode[] = []
          for (const id of newIds) {
            const w = editor.getWidget(id)
            if (w) {
              newLayouts.set(id, { x: w.layout.x, y: w.layout.y })
              newWidgets.push(w)
            }
          }
          s.initialLayouts = newLayouts
          s.initialBBox = unionBBox(newWidgets) ?? undefined
          s.altOnDown = false // already consumed
        }
        // (b) Surface the gesture to EditorStore so HUD overlays know
        // to switch their readout (X, Y instead of W × H). Cleared in
        // onPointerUp.
        useEditorStore.getState().actions.setInteraction({
          kind: 'moving',
          ids: s.movingIds ?? [],
          startedAt: Date.now(),
        })
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

      // Shift = axis-lock to the dominant direction. Applied after snap
      // so snapping doesn't fight us by reintroducing the other axis.
      // The "dominant" axis is decided from the un-snapped delta so the
      // lock direction stays stable across the drag.
      if (e.shiftKey) {
        const rawDx = dx / scale
        const rawDy = dy / scale
        if (Math.abs(rawDx) > Math.abs(rawDy)) cdy = 0
        else cdx = 0
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
    // Surface "no gesture in flight" to EditorStore so HUD overlays
    // revert to their default (W × H) readout. Idempotent — safe even
    // if the interaction was never bumped (pre-move cancelled, etc.).
    if (useEditorStore.getState().interaction.kind !== 'idle') {
      useEditorStore.getState().actions.setInteraction({ kind: 'idle' })
    }
    Object.assign(ctx.state, { phase: 'idle' } satisfies SelectState)
  },

  onDoubleClick(e, ctx) {
    const editor = ctx.editor
    const widgetId = findHitWidgetId(e.target)
    if (!widgetId) {
      // Double-clicking blank exits any active isolated mode.
      if (editor.getIsolatedGroupId() !== null) editor.setIsolatedGroup(null)
      return
    }
    const hit = editor.getWidget(widgetId)
    if (!hit?.groupId) {
      // Not part of a group — nothing special; leave selection alone.
      return
    }
    // Enter isolated mode for this group, narrow selection to the one
    // widget that was double-clicked.
    editor.setIsolatedGroup(hit.groupId)
    editor.select([widgetId])
  },

  onKeyDown(e, ctx) {
    const editor = ctx.editor
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const ids = editor.getSelectedIds()
      if (ids.length > 0) editor.removeWidgets(ids)
    } else if (e.key === 'Escape') {
      // Esc: exit isolated mode first, otherwise clear selection. The
      // two-step lets users back out of a group without losing the rest
      // of their context (Figma's behaviour).
      if (editor.getIsolatedGroupId() !== null) {
        editor.setIsolatedGroup(null)
      } else {
        editor.selectNone()
      }
    } else if (e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      editor.selectAll()
    }
  },
}
