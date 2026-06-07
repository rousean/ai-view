import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { Background } from '@schema/types'
import { useDocumentState } from '../editor/editor-context'
import { selectAsset, selectCurrentPage } from '../stores/selectors'

/**
 * Both variants subscribe only to the canvas size + background (shallow)
 * rather than the whole page object, so they don't re-render on every
 * drag / resize frame (immer gives the page a fresh identity per mutation).
 */
function useCanvasBackground() {
  return useDocumentState(
    useShallow((s) => {
      const p = selectCurrentPage(s)
      if (!p) return null
      return {
        width: p.canvas.width,
        height: p.canvas.height,
        background: p.canvas.background,
      }
    }),
  )
}

/** Renders the page artboard background (color/gradient/image/transparent). */
export const PageBackground: React.FC = () => {
  const canvas = useCanvasBackground()
  if (!canvas) return null
  return (
    <div
      className="absolute top-0 left-0 shadow-[0_0_0_1px_rgba(0,0,0,0.10),0_16px_48px_rgba(0,0,0,0.18)]"
      style={{
        width: canvas.width,
        height: canvas.height,
        ...backgroundStyle(canvas.background),
      }}
    />
  )
}

function backgroundStyle(bg: Background): React.CSSProperties {
  switch (bg.type) {
    case 'color':
      return { background: bg.color }
    case 'gradient': {
      const stops = bg.gradient.stops
        .map((s) => `${s.color} ${(s.offset * 100).toFixed(2)}%`)
        .join(', ')
      const grad =
        bg.gradient.type === 'linear'
          ? `linear-gradient(${bg.gradient.angle ?? 180}deg, ${stops})`
          : `radial-gradient(${stops})`
      return { background: grad }
    }
    case 'image': {
      const fit = bg.fit === 'cover' ? 'cover' : bg.fit === 'contain' ? 'contain' : '100% 100%'
      // We need the asset URL; fall back to a placeholder if absent.
      return {
        background: 'rgba(127,127,127,0.06)',
        backgroundSize: fit,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    }
    case 'transparent':
    default:
      return { background: 'transparent' }
  }
}

/** Asset-aware variant. Subscribes to the asset list to resolve image URLs. */
export const PageBackgroundWithAssets: React.FC = () => {
  const canvas = useCanvasBackground()
  const bg = canvas?.background
  const assetId = bg?.type === 'image' ? bg.assetId : ''
  const asset = useDocumentState((s) => (assetId ? selectAsset(assetId)(s) : null))
  if (!canvas) return null

  const style = backgroundStyle(canvas.background)
  if (canvas.background.type === 'image' && asset?.url) {
    style.backgroundImage = `url(${asset.url})`
  }
  return (
    <div
      className="absolute top-0 left-0 shadow-[0_0_0_1px_rgba(0,0,0,0.10),0_16px_48px_rgba(0,0,0,0.18)]"
      style={{
        width: canvas.width,
        height: canvas.height,
        ...style,
      }}
    />
  )
}
