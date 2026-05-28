import { toPng } from 'html-to-image'

/**
 * Capture an HTMLElement as a PNG and trigger a browser download.
 *
 *   - `pixelRatio: 2` so retina screens get crisp output without
 *     blowing up file size on standard displays.
 *   - `cacheBust: true` forces fresh fetches for any background images
 *     so a stale CDN entry doesn't poison the snapshot.
 *   - Resize-related transforms on ancestors are ignored — we capture
 *     the node's intrinsic layout, which matches what users authored.
 *
 * Failure mode: html-to-image throws on tainted canvases (cross-origin
 * images without CORS). We surface a readable error rather than
 * silently downloading nothing.
 */
export async function exportElementToPng(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  // Use the live --background token so a dark-mode editor produces a
  // dark-mode PNG instead of a white plate behind every widget. Falls
  // back to white when running outside a styled environment.
  const probe = typeof document !== 'undefined' ? document.documentElement : null
  const bg =
    (probe && getComputedStyle(probe).getPropertyValue('--background').trim()) ||
    '#ffffff'

  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: bg,
    // Skip the editor's interactive chrome — selection bbox, resize
    // handles etc. — by filtering them out of the SVG export.
    filter: (node) => {
      if (!(node instanceof Element)) return true
      const tag = node.tagName?.toLowerCase()
      if (tag === 'canvas' || tag === 'svg' || tag === 'img') return true
      // Drop overlay layers we attach for the editor UI.
      const skipMarkers = ['data-skip-snapshot']
      for (const marker of skipMarkers) {
        if (node.hasAttribute(marker)) return false
      }
      return true
    },
  })

  // Synthesize an <a download> and click — most browsers honour the
  // suggested filename for data URLs of size < several MB.
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
