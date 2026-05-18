import * as React from 'react'
import { useEditorStore } from '../stores/editor-store'

interface CameraTransformLayerProps {
  /** Style applied to the inner transformed div. */
  style?: React.CSSProperties
  children: React.ReactNode
  className?: string
}

/**
 * Applies the camera transform via direct DOM mutation, bypassing React
 * reconciliation. This is the single hottest path in the editor — every
 * pan / zoom should NOT trigger a React rerender of the canvas tree.
 *
 * The outer div is static; the inner div carries `transform: translate scale`.
 * A subscription to editorStore.camera writes the inline style imperatively.
 */
export const CameraTransformLayer: React.FC<CameraTransformLayerProps> = ({
  style,
  children,
  className,
}) => {
  const innerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const apply = (cam: { x: number; y: number; scale: number }) => {
      const el = innerRef.current
      if (!el) return
      el.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`
    }
    apply(useEditorStore.getState().camera)
    return useEditorStore.subscribe((s) => s.camera, apply, {
      equalityFn: (a, b) => a.x === b.x && a.y === b.y && a.scale === b.scale,
    })
  }, [])

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        ref={innerRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
}
