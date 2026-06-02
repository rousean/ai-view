import * as React from 'react'
import { Copy, Lock, Paintbrush, Trash2, Unlock } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import { useDashboardEditor, useDocumentState, useEditorState } from '../editor/editor-context'
import { useRuntimeStore } from '../stores/runtime-store'
import { selectWidgets } from '../stores/selectors'
import { unionBBox } from './transformer/geometry'

const GAP = 8 // screen px between the selection and the bar
const APPROX_H = 34 // bar height incl. border, for the above/below flip

/**
 * Floating quick-action bar pinned just above the current selection
 * (Figma-style). Lives inside the canvas viewport but OUTSIDE the camera
 * transform, so it stays a constant on-screen size while tracking the
 * selection's screen position. Hidden during any active gesture and in
 * preview mode. Flips below the selection when there's no room above.
 */
export function SelectionToolbar() {
  const editor = useDashboardEditor()
  const selectedIds = useEditorState((s) => s.selectedIds)
  const camera = useEditorState((s) => s.camera)
  const interactionKind = useEditorState((s) => s.interaction.kind)
  const isPreview = useRuntimeStore((s) => s.mode === 'preview')
  const widgets = useDocumentState(
    useShallow((s) => {
      const set = new Set(selectedIds)
      return selectWidgets(s).filter((w) => set.has(w.id))
    }),
  )

  // Only show on a settled selection — hide during any drag/resize/rotate/
  // marquee/guide gesture so it never obstructs the canvas mid-action.
  if (isPreview || interactionKind !== 'idle' || widgets.length === 0) return null
  const bb = unionBBox(widgets)
  if (!bb) return null

  const allLocked = widgets.every((w) => w.flags.locked)
  const topY = bb.y * camera.scale + camera.y
  const bottomY = (bb.y + bb.height) * camera.scale + camera.y
  const centerX = (bb.x + bb.width / 2) * camera.scale + camera.x
  const above = topY - GAP >= APPROX_H
  const style: React.CSSProperties = above
    ? { left: centerX, top: topY - GAP, transform: 'translate(-50%, -100%)' }
    : { left: centerX, top: bottomY + GAP, transform: 'translateX(-50%)' }

  const ids = selectedIds
  return (
    <div
      data-skip-snapshot
      className="bg-card border-border absolute z-30 flex items-center gap-px rounded-md border p-0.5 shadow-md"
      style={style}
      // Swallow pointer-downs so clicking the bar never starts a
      // marquee / deselect on the canvas underneath.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <ActionButton label="复制副本 · ⌘D" icon={Copy} onClick={() => editor.duplicateSelection()} />
      <ActionButton
        label="复制样式 · ⌘⌥C"
        icon={Paintbrush}
        onClick={() => editor.copyStyleFromSelection()}
      />
      <ActionButton
        label={allLocked ? '解锁' : '锁定'}
        icon={allLocked ? Lock : Unlock}
        onClick={() => editor.toggleLockedOnSelection()}
      />
      <ActionButton label="删除" icon={Trash2} danger onClick={() => editor.removeWidgets(ids)} />
    </div>
  )
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  danger,
}: {
  label: string
  icon: React.ComponentType<{ size?: number }>
  onClick: () => void
  danger?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            'flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm transition-colors',
            danger
              ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
              : 'text-foreground hover:bg-muted',
          )}
        >
          <Icon size={14} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}
