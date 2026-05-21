import * as React from 'react'
import type { Background, CanvasConfig } from '@schema/types'
import { useDocumentState } from '../editor/editor-context'
import { selectAsset, selectCurrentPage } from '../stores/selectors'

/** Renders the page artboard background (color/gradient/image/transparent). */
export const PageBackground: React.FC = () => {
  const page = useDocumentState((s) => selectCurrentPage(s))
  if (!page) return null
  return (
    <div
      className="absolute top-0 left-0 shadow-[0_0_0_1px_rgba(0,0,0,0.10),0_16px_48px_rgba(0,0,0,0.18)]"
      style={{
        width: page.canvas.width,
        height: page.canvas.height,
        ...backgroundStyle(page.canvas.background, page.canvas),
      }}
    />
  )
}

function backgroundStyle(bg: Background, canvas: CanvasConfig): React.CSSProperties {
  void canvas
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
  const page = useDocumentState((s) => selectCurrentPage(s))
  const bg = page?.canvas.background
  const assetId = bg?.type === 'image' ? bg.assetId : ''
  const asset = useDocumentState((s) => (assetId ? selectAsset(assetId)(s) : null))
  if (!page) return null

  const style = backgroundStyle(page.canvas.background, page.canvas)
  if (page.canvas.background.type === 'image' && asset?.url) {
    style.backgroundImage = `url(${asset.url})`
  }
  return (
    <div
      className="absolute top-0 left-0 shadow-[0_0_0_1px_rgba(0,0,0,0.10),0_16px_48px_rgba(0,0,0,0.18)]"
      style={{
        width: page.canvas.width,
        height: page.canvas.height,
        ...style,
      }}
    />
  )
}
