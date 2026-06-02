import { MousePointer2 } from 'lucide-react'
import type { WidgetNode } from '@schema/types'
import { rotatedAABB, unionBBox } from '../canvas/transformer/geometry'
import { buildSnapContext } from '../snap/build-context'
import { useSnapGuidesStore } from '../snap/snap-store'
import { useEditorStore } from '../stores/editor-store'
import type { Tool, ToolContext } from './tool.interface'

type EditorHandle = ToolContext['editor']

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
  /** Pre-drag selection snapshot — unioned in for an additive marquee. */
  marqueeBaseIds?: string[]
  /** Whether Shift / Ctrl / Cmd was held at marquee start (additive mode). */
  marqueeAdditive?: boolean
  /** Whether Alt (alone) was held at marquee start (subtract mode). */
  marqueeSubtract?: boolean
  hitWidgetId?: string
  /**
   * Whether Alt was held at pointer-down. We don't act on it until the
   * pointer actually starts dragging (Alt+down with no move = pierce-
   * select; Alt+drag = duplicate-then-move).
   */
  altOnDown?: boolean
  /** Latest pointer screen position — drives the auto-pan loop. */
  lastClient?: { x: number; y: number }
  /** Modifier keys at the last pointer event (replayed by the auto-pan loop). */
  lastMods?: { alt: boolean; shift: boolean }
  /** Active auto-pan rAF handle, or null when not panning. */
  edgeRAF?: number | null
  /** Teardown for the auto-pan's window pointerup / pointercancel guards. */
  edgeTeardown?: () => void
}

const MOVE_THRESHOLD = 4 // px in screen space

// Auto-pan: when the pointer gets within EDGE_MARGIN px of a viewport edge
// during a move / marquee, the camera scrolls toward it at up to
// EDGE_MAX_SPEED px per frame, so you can drag past the visible area.
const EDGE_MARGIN = 44
const EDGE_MAX_SPEED = 16

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

// ── Auto-pan helpers ─────────────────────────────────────────────────

function getViewportRect(): DOMRect | null {
  if (typeof document === 'undefined') return null
  const el = document.querySelector('[data-canvas-viewport]')
  return el ? el.getBoundingClientRect() : null
}

/**
 * Camera pan (screen px / frame) that scrolls toward whichever edge the
 * pointer is hugging; `{0, 0}` when the pointer is clear of every edge.
 * Positive x reveals content on the left, negative reveals the right
 * (mirrors `panBy`, which translates the camera).
 */
function edgeVelocity(client: { x: number; y: number }, rect: DOMRect): { x: number; y: number } {
  let x = 0
  let y = 0
  const left = client.x - rect.left
  const right = rect.right - client.x
  const top = client.y - rect.top
  const bottom = rect.bottom - client.y
  if (left < EDGE_MARGIN) x = ((EDGE_MARGIN - left) / EDGE_MARGIN) * EDGE_MAX_SPEED
  else if (right < EDGE_MARGIN) x = -((EDGE_MARGIN - right) / EDGE_MARGIN) * EDGE_MAX_SPEED
  if (top < EDGE_MARGIN) y = ((EDGE_MARGIN - top) / EDGE_MARGIN) * EDGE_MAX_SPEED
  else if (bottom < EDGE_MARGIN) y = -((EDGE_MARGIN - bottom) / EDGE_MARGIN) * EDGE_MAX_SPEED
  return { x, y }
}

/**
 * Apply the move gesture for a given canvas-space pointer position. The
 * delta is derived from `canvasStart → canvasNow` (not a fixed screen
 * delta), so it stays correct while auto-pan scrolls the camera mid-drag.
 * Idempotent: it sets absolute layouts, so a real pointer-move and an
 * auto-pan frame in the same tick converge on the same result.
 */
function applyMoveAt(
  editor: EditorHandle,
  s: SelectState,
  canvasNow: { x: number; y: number },
  mods: { alt: boolean; shift: boolean },
): void {
  if (!s.canvasStart) return
  const rawX = canvasNow.x - s.canvasStart.x
  const rawY = canvasNow.y - s.canvasStart.y
  let cdx = rawX
  let cdy = rawY
  const scale = editor.getCamera().scale

  // ── Snap pass ──────────────────────────────────────────────────────
  // Alt held = bypass snap (free positioning). Also respects the
  // EditorStore.view.snapTo* toggles. Defensive: skip if editor.snap is
  // missing (e.g. a stale HMR instance).
  if (!mods.alt && s.initialBBox && editor.snap && shouldRunSnap()) {
    try {
      const view = useEditorStore.getState().view
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
      const result = editor.snap.snap(
        movedBBox,
        { left: true, right: true, top: true, bottom: true, centerX: true, centerY: true },
        buildSnapContext(editor, s.movingIds ?? []),
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

  // Shift = axis-lock to the dominant direction, decided from the
  // un-snapped delta so the lock stays stable across the drag.
  if (mods.shift) {
    if (Math.abs(rawX) > Math.abs(rawY)) cdy = 0
    else cdx = 0
  }

  const updates = (s.movingIds ?? []).map((id) => {
    const init = s.initialLayouts?.get(id)
    return { id, layout: { x: (init?.x ?? 0) + cdx, y: (init?.y ?? 0) + cdy } }
  })
  editor.updateLayoutBatch(updates)
}

/** Emit the live marquee rect for the given canvas-space pointer. */
function applyMarqueeAt(
  editor: EditorHandle,
  s: SelectState,
  canvasNow: { x: number; y: number },
): void {
  if (!s.marqueeOrigin) return
  const a = s.marqueeOrigin
  editor.bus.emit('plugin.marquee.update', {
    x: Math.min(a.x, canvasNow.x),
    y: Math.min(a.y, canvasNow.y),
    width: Math.abs(canvasNow.x - a.x),
    height: Math.abs(canvasNow.y - a.y),
  })
}

function stopEdgePan(s: SelectState): void {
  if (s.edgeRAF != null) {
    cancelAnimationFrame(s.edgeRAF)
    s.edgeRAF = null
  }
  if (s.edgeTeardown) {
    s.edgeTeardown()
    s.edgeTeardown = undefined
  }
}

function edgePanTick(editor: EditorHandle, s: SelectState): void {
  if (s.phase !== 'moving' && s.phase !== 'marquee') {
    stopEdgePan(s)
    return
  }
  const rect = getViewportRect()
  if (!rect || !s.lastClient) {
    stopEdgePan(s)
    return
  }
  const vel = edgeVelocity(s.lastClient, rect)
  if (vel.x === 0 && vel.y === 0) {
    stopEdgePan(s)
    return
  }
  editor.panBy(vel.x, vel.y)
  const canvasNow = editor.screenToCanvas(s.lastClient, { left: rect.left, top: rect.top })
  if (s.phase === 'moving') {
    applyMoveAt(editor, s, canvasNow, s.lastMods ?? { alt: false, shift: false })
  } else {
    applyMarqueeAt(editor, s, canvasNow)
  }
  s.edgeRAF = requestAnimationFrame(() => edgePanTick(editor, s))
}

/**
 * Start / keep / stop the auto-pan loop based on the latest pointer
 * position. Called after every move / marquee update. A window-level
 * pointerup / pointercancel guard force-stops the loop even if the normal
 * onPointerUp somehow doesn't fire (e.g. a touch cancel).
 */
function maybeEdgePan(editor: EditorHandle, s: SelectState): void {
  const rect = getViewportRect()
  if (!rect || !s.lastClient) {
    stopEdgePan(s)
    return
  }
  const vel = edgeVelocity(s.lastClient, rect)
  if (vel.x === 0 && vel.y === 0) {
    stopEdgePan(s)
    return
  }
  if (s.edgeRAF != null) return // already looping
  const onEnd = () => stopEdgePan(s)
  window.addEventListener('pointerup', onEnd)
  window.addEventListener('pointercancel', onEnd)
  s.edgeTeardown = () => {
    window.removeEventListener('pointerup', onEnd)
    window.removeEventListener('pointercancel', onEnd)
  }
  s.edgeRAF = requestAnimationFrame(() => edgePanTick(editor, s))
}

export const SelectTool: Tool = {
  type: 'select',
  label: '选择',
  shortcut: 'V',
  icon: MousePointer2 as Tool['icon'],

  onActivate(ctx) {
    Object.assign(ctx.state, { phase: 'idle' } satisfies SelectState)
  },

  onDeactivate(ctx) {
    // Stop any in-flight auto-pan if the user switches tools mid-drag.
    stopEdgePan(getState(ctx))
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
      // Filter out locked widgets up-front — they ride along in the
      // selection (so the property panel still works on them, Cmd+A
      // still picks them up), but they cannot be the subject of a
      // move gesture. Mixing them into `movingIds` would silently
      // displace locked widgets by the drag delta.
      const movableIds: string[] = []
      for (const id of ids) {
        const w = editor.getWidget(id)
        if (!w) continue
        initialLayouts.set(id, { x: w.layout.x, y: w.layout.y })
        if (!w.flags.locked) {
          selectedWidgets.push(w)
          movableIds.push(id)
        }
      }
      s.movingIds = movableIds
      s.initialLayouts = initialLayouts
      // Snapshot the visual bbox so snap targets stay stable for the
      // entire gesture (no jitter when intermediate positions snap on/off).
      s.initialBBox = unionBBox(selectedWidgets) ?? undefined
      editor.mark('Move widgets')
    } else {
      // Empty canvas click → marquee or clear selection. Also exits
      // isolated-group mode if we were in one. Modifiers change the mode:
      // Shift / Ctrl / Cmd = additive (union the box's hits into the
      // current selection); Alt = subtract (remove the box's hits from it).
      const additive = e.shiftKey || e.ctrlKey || e.metaKey
      const subtract = e.altKey && !additive
      if (!additive && !subtract) {
        editor.selectNone()
        if (editor.getIsolatedGroupId() !== null) editor.setIsolatedGroup(null)
      }
      s.phase = 'marquee'
      s.marqueeOrigin = ctx.pointer.canvas
      s.marqueeAdditive = additive
      s.marqueeSubtract = subtract
      s.marqueeBaseIds = additive || subtract ? editor.getSelectedIds() : undefined
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
        // (a) If Alt was held at pointer-down, this is alt-drag duplicate.
        //     Clone the selection in place, then re-snapshot initialLayouts
        //     / initialBBox against the clones so the drag (and snap) acts
        //     on the new copies, leaving the originals untouched.
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
        // (b) Surface the gesture to EditorStore so HUD overlays switch
        // their readout (X, Y instead of W × H). Cleared in onPointerUp.
        useEditorStore.getState().actions.setInteraction({
          kind: 'moving',
          ids: s.movingIds ?? [],
          startedAt: Date.now(),
        })
      }
      s.phase = 'moving'
      s.lastClient = { x: e.clientX, y: e.clientY }
      s.lastMods = { alt: e.altKey, shift: e.shiftKey }
      // Camera-aware: derive the delta from the live canvas pointer so the
      // move stays correct while auto-pan scrolls the camera mid-drag.
      applyMoveAt(editor, s, ctx.pointer.canvas, s.lastMods)
      maybeEdgePan(editor, s)
    } else if (s.phase === 'marquee') {
      if (!s.marqueeOrigin) return
      s.lastClient = { x: e.clientX, y: e.clientY }
      applyMarqueeAt(editor, s, ctx.pointer.canvas)
      maybeEdgePan(editor, s)
    }
  },

  onPointerUp(_e, ctx) {
    const editor = ctx.editor
    const s = getState(ctx)
    stopEdgePan(s)
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
          // Locked widgets are intentionally skipped — the whole point
          // of locking is to take a widget out of the canvas's input
          // model. Without this filter a marquee would still grab them,
          // making lock feel half-broken.
          const hitIds = editor
            .getAllWidgets()
            .filter((w) => {
              if (w.flags.locked || w.flags.hidden) return false
              const aabb = rotatedAABB(w)
              return (
                aabb.x + aabb.width >= rect.x &&
                aabb.x <= rect.x + rect.width &&
                aabb.y + aabb.height >= rect.y &&
                aabb.y <= rect.y + rect.height
              )
            })
            .map((w) => w.id)
          if (s.marqueeSubtract && s.marqueeBaseIds) {
            // Remove the box's hits from the pre-drag selection.
            const remove = new Set(hitIds)
            editor.select(s.marqueeBaseIds.filter((id) => !remove.has(id)))
          } else if (s.marqueeAdditive && s.marqueeBaseIds) {
            // Union the box's hits into the pre-drag selection.
            const set = new Set(s.marqueeBaseIds)
            for (const id of hitIds) set.add(id)
            editor.select([...set])
          } else {
            editor.select(hitIds)
          }
        }
      }
      editor.bus.emit('plugin.marquee.update', null)
    }
    // Clear any active alignment guides at the end of every gesture.
    useSnapGuidesStore.getState().clear()
    // Surface "no gesture in flight" to EditorStore so HUD overlays
    // revert to their default (W × H) readout. Idempotent — safe even
    // if the interaction was never bumped (pre-move cancelled, etc.).
    //
    // Skip guide gestures (creating-guide / moving-guide): they run on
    // their own window-level pointer listeners and clear their own
    // interaction. This handler fires FIRST (React delegates at the root,
    // which bubbles before window), so resetting here would cancel an
    // in-progress ruler-drag before its own listener can commit it.
    const liveKind = useEditorStore.getState().interaction.kind
    if (liveKind !== 'idle' && liveKind !== 'creating-guide' && liveKind !== 'moving-guide') {
      useEditorStore.getState().actions.setInteraction({ kind: 'idle' })
    }
    Object.assign(ctx.state, { phase: 'idle' } satisfies SelectState)
  },

  onDoubleClick(e, ctx) {
    const editor = ctx.editor
    const widgetId = findHitWidgetId(e.target)
    if (!widgetId) {
      // Double-click on blank canvas does two things in sequence:
      //   1. exit any active isolated-group mode
      //   2. open the command palette so the user can pick a widget
      //      to add — saves a Cmd+K hop for the common "place something
      //      here" workflow.
      if (editor.getIsolatedGroupId() !== null) editor.setIsolatedGroup(null)
      editor.setPaletteOpen(true)
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
      // preventDefault so the canvas keydown doesn't also run the global
      // Delete shortcut on the same event — a second pass would re-toast
      // "已跳过锁定的组件" when the whole selection is locked.
      e.preventDefault()
      const ids = editor.getSelectedIds()
      if (ids.length > 0) editor.removeWidgets(ids)
    } else if (e.key === 'Escape') {
      // Esc: exit isolated mode first, otherwise clear selection. The
      // two-step lets users back out of a group without losing the rest
      // of their context (Figma's behaviour). preventDefault stops the
      // canvas keydown from also running the global Esc shortcut, which
      // would collapse both steps into one press (exit isolation AND
      // clear the selection at the same time).
      e.preventDefault()
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
