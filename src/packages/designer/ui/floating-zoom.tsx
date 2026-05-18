import * as React from 'react'
import { Maximize, Minus, Plus } from 'lucide-react'
import { useDashboardEditor, useEditorState } from '../editor/editor-context'

/** Bottom-right floating zoom control. Mirrors the design's FloatingZoom. */
export function FloatingZoom() {
  const editor = useDashboardEditor()
  const scale = useEditorState((s) => s.camera.scale)

  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        background: 'var(--panel-bg)',
        borderRadius: 6,
        boxShadow: 'var(--shadow-popover)',
        padding: 2,
        zIndex: 20,
      }}
    >
      <button
        className="btn btn-ghost-icon"
        onClick={() => editor.zoomBy(-0.1)}
        aria-label="缩小"
      >
        <Minus size={14} />
      </button>
      <span
        className="t-num t-sm"
        style={{ width: 42, textAlign: 'center' }}
      >
        {Math.round(scale * 100)}%
      </span>
      <button
        className="btn btn-ghost-icon"
        onClick={() => editor.zoomBy(0.1)}
        aria-label="放大"
      >
        <Plus size={14} />
      </button>
      <div className="divider-v" style={{ height: 16, alignSelf: 'center' }} />
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
