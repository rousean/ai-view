import * as React from 'react'
import { Maximize, Minus, Plus } from 'lucide-react'
import { useDashboardEditor, useEditorState } from '../editor/editor-context'

/** Bottom-right floating zoom control. Mirrors the design's FloatingZoom. */
export function FloatingZoom() {
  const editor = useDashboardEditor()
  const scale = useEditorState((s) => s.camera.scale)

  return (
    <div
      className="absolute right-4 bottom-4 z-20 flex items-center rounded-md p-0.5"
      style={{
        background: 'var(--panel-bg)',
        boxShadow: 'var(--shadow-popover)',
      }}
    >
      <button
        className="btn btn-ghost-icon"
        onClick={() => editor.zoomBy(-0.1)}
        aria-label="缩小"
      >
        <Minus size={14} />
      </button>
      <span className="t-num t-sm w-10.5 text-center">
        {Math.round(scale * 100)}%
      </span>
      <button
        className="btn btn-ghost-icon"
        onClick={() => editor.zoomBy(0.1)}
        aria-label="放大"
      >
        <Plus size={14} />
      </button>
      <div className="divider-v h-4 self-center" />
      <button
        className="btn btn-ghost-icon"
        onClick={() => editor.resetView()}
        aria-label="适应屏幕"
      >
        <Maximize size={14} />
      </button>
    </div>
  )
}
