import * as React from 'react'
import { Hand, MousePointer2, Redo2, RotateCcw, Save, Undo2, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { useDashboardEditor, useEditorState } from '../editor/editor-context'

interface ToolbarProps {
  className?: string
}

/**
 * Top toolbar — single row of icon buttons grouped by purpose:
 *   tool picker | history | zoom | …spacer… | save
 *
 * All controls are shadcn primitives so the toolbar inherits the project
 * theme automatically (button hover states, focus rings, tooltip styling).
 */
export const Toolbar: React.FC<ToolbarProps> = ({ className }) => {
  const editor = useDashboardEditor()
  const tool = useEditorState((s) => s.tool)
  const scale = useEditorState((s) => s.camera.scale)

  // Force this component to re-evaluate canUndo / canRedo whenever the
  // history bus reports a change. Cheap; rerenders only the toolbar.
  const [, force] = React.useReducer((x) => x + 1, 0)
  React.useEffect(() => editor.bus.on('history.applied', () => force()), [editor])
  React.useEffect(() => editor.bus.on('history.undone', () => force()), [editor])
  React.useEffect(() => editor.bus.on('history.redone', () => force()), [editor])

  const canUndo = editor.canUndo()
  const canRedo = editor.canRedo()

  return (
    <div className={`flex h-12 items-center gap-2 border-b bg-card px-3 ${className ?? ''}`}>
      {/* Tool picker */}
      <ToggleGroup
        type="single"
        value={tool}
        onValueChange={(v) => v && editor.setTool(v)}
        variant="outline"
        size="sm"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="select" aria-label="选择">
              <MousePointer2 />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>选择 (V)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem value="pan" aria-label="平移">
              <Hand />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>平移 (H)</TooltipContent>
        </Tooltip>
      </ToggleGroup>

      <Separator orientation="vertical" className="!h-5" />

      {/* History */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => editor.undo()}
              disabled={!canUndo}
            >
              <Undo2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>撤销 (Ctrl+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => editor.redo()}
              disabled={!canRedo}
            >
              <Redo2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>重做 (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="!h-5" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon-sm" variant="ghost" onClick={() => editor.zoomBy(-0.1)}>
              <ZoomOut />
            </Button>
          </TooltipTrigger>
          <TooltipContent>缩小</TooltipContent>
        </Tooltip>
        <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(scale * 100)}%
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon-sm" variant="ghost" onClick={() => editor.zoomBy(0.1)}>
              <ZoomIn />
            </Button>
          </TooltipTrigger>
          <TooltipContent>放大</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon-sm" variant="ghost" onClick={() => editor.resetView()}>
              <RotateCcw />
            </Button>
          </TooltipTrigger>
          <TooltipContent>100%</TooltipContent>
        </Tooltip>
      </div>

      <div className="ml-auto">
        <Button size="sm" onClick={() => editor.save()}>
          <Save />
          保存
        </Button>
      </div>
    </div>
  )
}
