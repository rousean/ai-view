import * as React from 'react'
import { GripVertical, Hand, MousePointer2, Redo2, Undo2 } from 'lucide-react'
import { Feedback } from '@dnd-kit/dom'
import { useDragDropMonitor, useDraggable, type DragEndEvent } from '@dnd-kit/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import { useDashboardEditor, useEditorState } from '../editor/editor-context'

/**
 * Floating tool palette — free-draggable (variant B), default-pinned to the
 * top-centre of the canvas.
 *
 * Drag model (via @dnd-kit/react):
 *   - The OUTER wrapper owns the committed position. It centres itself
 *     (`left-1/2 -translate-x-1/2`) and applies the dragged offset through
 *     `margin` — a React-controlled property dnd-kit never touches.
 *   - The INNER toolbar is the actual `useDraggable` element; dnd-kit's
 *     `feedback: 'move'` applies a transient `transform` to it during the
 *     drag. Keeping the two on different elements/properties means React and
 *     dnd-kit never fight over the same `transform`.
 *   - A dedicated grip handle starts the drag, so the tool buttons stay
 *     plain clickable controls.
 *   - On drop we read the final delta and fold it into the committed offset,
 *     clamped so the palette can't be stranded off the canvas.
 *
 * Holds the tool group only (select / pan / placeholders / fit). Selection
 * alignment & distribution live in the right-hand property panel, alongside
 * the rest of the layout controls — they're per-selection layout ops, not
 * canvas tools.
 */
export function FloatingTools() {
  const editor = useDashboardEditor()
  const tool = useEditorState((s) => s.tool)

  // Re-render on history changes so the undo/redo buttons' enabled state
  // (canUndo / canRedo) stays current — those live on the history manager,
  // not in a store.
  const [, force] = React.useReducer((x) => x + 1, 0)
  React.useEffect(() => {
    const off = [
      editor.bus.on('history.applied', () => force()),
      editor.bus.on('history.undone', () => force()),
      editor.bus.on('history.redone', () => force()),
      editor.bus.on('history.cleared', () => force()),
    ]
    return () => off.forEach((fn) => fn())
  }, [editor])

  // Committed pixel offset from the default top-centre anchor.
  const dragId = React.useId()
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = React.useState({ x: 0, y: 0 })

  const { ref: draggableRef, handleRef, isDragging } = useDraggable({
    id: dragId,
    type: 'panel',
    // Move the element itself (not a clone) and skip the snap-back so the
    // committed offset applied on drop lands without a flash.
    plugins: [Feedback.configure({ feedback: 'move', dropAnimation: null })],
  })

  // Observe the editor's shared DragDropProvider (mounted in EditorRoot) for
  // the end of *this* panel's drag, then fold the delta into `pos`.
  useDragDropMonitor({
    onDragEnd(event: DragEndEvent) {
      if (event.canceled || event.operation.source?.id !== dragId) return
      const t = event.operation.transform
      if (!t) return
      setPos((prev) => clampToParent(wrapperRef.current, { x: prev.x + t.x, y: prev.y + t.y }))
    },
  })

  return (
    <div
      ref={wrapperRef}
      className="absolute top-3 left-1/2 z-20 -translate-x-1/2"
      style={{ marginLeft: pos.x, marginTop: pos.y }}
    >
      <div
        ref={draggableRef}
        className={cn(
          'bg-card border-border flex items-center gap-px rounded-lg border p-1 shadow-md',
          isDragging && 'shadow-lg',
        )}
      >
        {/* ── Drag handle ─────────────────────────────────────────── */}
        <button
          ref={handleRef}
          type="button"
          aria-label="拖动工具栏"
          title="拖动工具栏"
          className={cn(
            'text-muted-foreground/50 hover:bg-muted hover:text-foreground flex h-7 w-5 shrink-0 touch-none items-center justify-center rounded-sm transition-colors',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
        >
          <GripVertical size={14} />
        </button>
        <Divider />

        {/* ── History ─────────────────────────────────────────────── */}
        <ToolButton
          label="撤销 · ⌘Z"
          icon={Undo2}
          onClick={() => editor.undo()}
          disabled={!editor.canUndo()}
        />
        <ToolButton
          label="重做 · ⌘⇧Z"
          icon={Redo2}
          onClick={() => editor.redo()}
          disabled={!editor.canRedo()}
        />
        <Divider />

        {/* ── Tools ───────────────────────────────────────────────── */}
        <ToolButton
          label="选择 · V"
          icon={MousePointer2}
          onClick={() => editor.setTool('select')}
          active={tool === 'select'}
        />
        <ToolButton
          label="抓手 · H"
          icon={Hand}
          onClick={() => editor.setTool('pan')}
          active={tool === 'pan'}
        />
      </div>
    </div>
  )
}

interface ToolButtonProps {
  label: string
  icon: React.ComponentType<{ size?: number }>
  onClick?: () => void
  active?: boolean
  /** Disabled (e.g. undo with nothing to undo) — greyed, no "soon" hint. */
  disabled?: boolean
  /** When true, render as a visible-but-disabled placeholder. */
  placeholder?: boolean
}

function ToolButton({ label, icon: Icon, onClick, active, disabled, placeholder }: ToolButtonProps) {
  const inert = placeholder || disabled
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={inert ? undefined : onClick}
          disabled={inert}
          aria-label={label}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-sm transition-colors',
            inert
              ? 'text-muted-foreground/40 cursor-not-allowed opacity-70'
              : active
                ? 'bg-primary/10 text-primary cursor-pointer'
                : 'text-foreground hover:bg-muted cursor-pointer',
          )}
        >
          <Icon size={14} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {placeholder ? `${label} · 即将上线` : label}
      </TooltipContent>
    </Tooltip>
  )
}

function Divider() {
  return <div aria-hidden className="bg-border mx-[3px] h-4 w-px" />
}

// ── Drag clamp ───────────────────────────────────────────────────────

const DRAG_MARGIN = 8
const BASE_TOP = 12 // matches the `top-3` anchor

/**
 * Keep the palette within its positioned ancestor (the canvas area) so a
 * drag can never strand it fully off-screen. `pos` is the centre offset from
 * the default top-centre anchor, in px.
 */
function clampToParent(
  wrap: HTMLElement | null,
  pos: { x: number; y: number },
): { x: number; y: number } {
  const parent = wrap?.offsetParent as HTMLElement | null
  if (!wrap || !parent) return pos
  const pw = parent.clientWidth
  const ph = parent.clientHeight
  const halfW = wrap.offsetWidth / 2
  const h = wrap.offsetHeight

  // Centre-x relative to the parent's left edge = pw/2 + pos.x.
  const minCx = halfW + DRAG_MARGIN
  const maxCx = Math.max(minCx, pw - halfW - DRAG_MARGIN)
  const cx = Math.min(Math.max(pw / 2 + pos.x, minCx), maxCx)

  // Top relative to the parent's top edge = BASE_TOP + pos.y.
  const minTop = DRAG_MARGIN
  const maxTop = Math.max(minTop, ph - h - DRAG_MARGIN)
  const top = Math.min(Math.max(BASE_TOP + pos.y, minTop), maxTop)

  return { x: cx - pw / 2, y: top - BASE_TOP }
}
