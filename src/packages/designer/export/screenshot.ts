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
  opts: { width?: number; height?: number } = {},
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
    // The snapshot target (camera-transform layer) has no intrinsic size —
    // its children are absolutely positioned, so `clientWidth/Height` is 0
    // and html-to-image would capture a 0×0 image. It also carries the live
    // pan/zoom transform. So: take the artboard's dimensions explicitly and
    // reset the transform on the clone — the PNG is then the page at 1:1,
    // top-left origin, regardless of how the user is currently viewing it.
    width: opts.width,
    height: opts.height,
    style: {
      transform: 'none',
      transformOrigin: 'top left',
      willChange: 'auto',
    },
    // Skip the editor's interactive chrome — selection bbox, resize handles,
    // grid, guides, safe-area, smart guides. They're all marked
    // `data-skip-snapshot`; test that FIRST. (The previous order returned
    // early for every svg/canvas/img, so overlay <svg> layers like the grid
    // and smart guides slipped through and leaked into the export.)
    filter: (node) => {
      if (!(node instanceof Element)) return true
      return !node.hasAttribute('data-skip-snapshot')
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
