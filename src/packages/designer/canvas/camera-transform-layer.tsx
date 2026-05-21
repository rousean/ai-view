import * as React from 'react'
import { cn } from '~/lib/utils'
import { useEditorStore } from '../stores/editor-store'

interface CameraTransformLayerProps {
  /** Extra classes applied to the inner transformed div. */
  innerClassName?: string
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
  innerClassName,
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
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      <div
        ref={innerRef}
        // `willChange: transform` is not expressible as a Tailwind utility
        // and is essential for keeping the camera transform on the GPU.
        style={{ willChange: 'transform' }}
        className={cn('absolute top-0 left-0 origin-top-left', innerClassName)}
      >
        {children}
      </div>
    </div>
  )
}
