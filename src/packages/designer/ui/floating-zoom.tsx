import * as React from 'react'
import { ChevronDown, Crosshair, Map, Maximize, Minus, Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Separator } from '~/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import { useDashboardEditor, useEditorState } from '../editor/editor-context'
import { useEditorStore } from '../stores/editor-store'

/**
 * Bottom-right floating zoom control.
 *
 * Layout: `−  100% ▾  +  │  ⌖fit`
 *
 * The percentage doubles as a dropdown trigger — clicking it opens a
 * menu of preset zoom levels plus "fit to screen" and "fit to selection"
 * so the user doesn't have to chain `Cmd+-` to land on a specific zoom.
 */
const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4] as const

export function FloatingZoom() {
  const editor = useDashboardEditor()
  const scale = useEditorState((s) => s.camera.scale)
  const viewportSize = useEditorState((s) => s.viewportSize)
  const hasSelection = useEditorState((s) => s.selectedIds.length > 0)
  const minimapOn = useEditorState((s) => s.panels.minimap)

  // Jump to a preset zoom while keeping whatever point is currently
  // under the viewport centre still under the viewport centre — so the
  // preset doesn't fling the artboard off-screen.
  const setZoomKeepingCentre = (next: number) => {
    const cur = editor.getCamera()
    const vw = viewportSize.width
    const vh = viewportSize.height
    if (vw <= 0 || vh <= 0) {
      editor.setCamera({ scale: next })
      return
    }
    const cx = (vw / 2 - cur.x) / cur.scale
    const cy = (vh / 2 - cur.y) / cur.scale
    editor.setCamera({
      scale: next,
      x: vw / 2 - cx * next,
      y: vh / 2 - cy * next,
    })
  }

  return (
    <div className="bg-card absolute right-4 bottom-4 z-20 flex items-center rounded-md p-0.5 shadow-md">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => editor.zoomBy(-0.1)}
            aria-label="缩小"
          >
            <Minus size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>缩小 (⌘-)</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="hover:bg-muted flex h-7 min-w-[3.5rem] cursor-pointer items-center justify-center gap-0.5 rounded-sm px-2 text-xs tabular-nums"
            aria-label="缩放预设"
          >
            {Math.round(scale * 100)}%
            <ChevronDown size={10} className="text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-48">
          {ZOOM_PRESETS.map((z) => (
            <DropdownMenuItem
              key={z}
              onSelect={() => setZoomKeepingCentre(z)}
              className="justify-between"
            >
              <span>缩放到 {Math.round(z * 100)}%</span>
              {z === 1 && <DropdownMenuShortcut>⌘0</DropdownMenuShortcut>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => editor.fitToScreen()}>
            <Maximize />
            <span className="flex-1">适应屏幕</span>
            <DropdownMenuShortcut>⌘1</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!hasSelection}
            onSelect={() => editor.fitToSelection()}
          >
            <Crosshair />
            <span className="flex-1">缩放到选中</span>
            <DropdownMenuShortcut>⌘2</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => editor.zoomBy(0.1)}
            aria-label="放大"
          >
            <Plus size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>放大 (⌘+)</TooltipContent>
      </Tooltip>
      <Separator orientation="vertical" className="mx-1 h-4 self-center" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => editor.fitToScreen()}
            aria-label="适应屏幕"
          >
            <Maximize size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>适应屏幕 (⌘1)</TooltipContent>
      </Tooltip>
      <Separator orientation="vertical" className="mx-1 h-4 self-center" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => useEditorStore.getState().actions.togglePanel('minimap')}
            aria-label="小地图"
            className={cn(minimapOn && 'text-primary')}
          >
            <Map size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>小地图导航</TooltipContent>
      </Tooltip>
    </div>
  )
}
