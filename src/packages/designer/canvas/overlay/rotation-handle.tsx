import * as React from 'react'
import { useEditorStore } from '../../stores/editor-store'
import { useRotateGesture } from '../interaction/use-rotate-gesture'

interface Props {
  bbox: { x: number; y: number; width: number; height: number }
}

/**
 * Round handle floating above the bbox top edge. Drag in a circular path
 * around the bbox center to rotate. Shift snaps to 15° increments.
 */
export const RotationHandle: React.FC<Props> = ({ bbox }) => {
  const start = useRotateGesture()
  const scale = useEditorStore((s) => s.camera.scale)
  const offset = 24 / scale
  const sz = 12 / scale

  return (
    <>
      {/* Connector line */}
      <div
        className="bg-primary pointer-events-none absolute"
        style={{
          left: bbox.x + bbox.width / 2 - 0.5 / scale,
          top: bbox.y - offset,
          width: 1 / scale,
          height: offset,
        }}
      />
      <div
        onPointerDown={start}
        className="bg-card pointer-events-auto absolute cursor-grab touch-none rounded-full"
        style={{
          left: bbox.x + bbox.width / 2 - sz / 2,
          top: bbox.y - offset - sz / 2,
          width: sz,
          height: sz,
          border: `${1.5 / scale}px solid var(--primary)`,
        }}
      />
    </>
  )
}
