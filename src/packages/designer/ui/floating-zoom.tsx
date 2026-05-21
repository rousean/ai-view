import * as React from 'react'
import { Maximize, Minus, Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { useDashboardEditor, useEditorState } from '../editor/editor-context'

/** Bottom-right floating zoom control. Mirrors the design's FloatingZoom. */
export function FloatingZoom() {
  const editor = useDashboardEditor()
  const scale = useEditorState((s) => s.camera.scale)

  return (
    <div className="bg-card absolute right-4 bottom-4 z-20 flex items-center rounded-md p-0.5 shadow-md">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.zoomBy(-0.1)}
        aria-label="缩小"
      >
        <Minus size={14} />
      </Button>
      <span className="w-10.5 text-center text-xs tabular-nums">
        {Math.round(scale * 100)}%
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.zoomBy(0.1)}
        aria-label="放大"
      >
        <Plus size={14} />
      </Button>
      <Separator orientation="vertical" className="mx-1 h-4 self-center" />
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.resetView()}
        aria-label="适应屏幕"
      >
        <Maximize size={14} />
      </Button>
    </div>
  )
}
