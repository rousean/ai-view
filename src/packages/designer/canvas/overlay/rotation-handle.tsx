import * as React from 'react'
import { useEditorStore } from '../../stores/editor-store'
import { useRotateGesture } from '../interaction/use-rotate-gesture'

interface Props {
  bbox: { x: number; y: number; width: number; height: number }
  /**
   * The selection chrome's rotation in degrees. Added to each corner's base
   * angle so the cursor keeps pointing "around" the box even after the
   * widget itself is rotated. (The hotzones already rotate visually because
   * they live inside the chrome's rotate transform — only the cursor glyph
   * needs the same offset.)
   */
  rotation?: number
}

/**
 * Figma/tldraw-style rotation cursor: a curved arrow with a white halo +
 * black body so it reads on any background, rotated by `deg`. The glyph is
 * tldraw's battle-tested rotate-corner SVG, embedded as a data-URI cursor
 * (hotspot at the 16 16 centre of the 32×32 canvas). Falls back to `grab`.
 */
function makeRotateCursor(deg: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
    `<g transform="rotate(${deg} 16 16)">` +
    `<path d="M22.4789 9.45728L25.9935 12.9942L22.4789 16.5283V14.1032C18.126 14.1502 14.6071 17.6737 14.5675 22.0283H17.05L13.513 25.543L9.97889 22.0283H12.5674C12.6071 16.5691 17.0214 12.1503 22.4789 12.1031L22.4789 9.45728Z" fill="black"/>` +
    `<path fill-rule="evenodd" clip-rule="evenodd" d="M21.4789 7.03223L27.4035 12.9945L21.4789 18.9521V15.1868C18.4798 15.6549 16.1113 18.0273 15.649 21.0284H19.475L13.5128 26.953L7.55519 21.0284H11.6189C12.1243 15.8155 16.2679 11.6677 21.4789 11.1559L21.4789 7.03223ZM22.4789 12.1031C17.0214 12.1503 12.6071 16.5691 12.5674 22.0284H9.97889L13.513 25.543L17.05 22.0284H14.5675C14.5705 21.6896 14.5947 21.3558 14.6386 21.0284C15.1157 17.4741 17.9266 14.6592 21.4789 14.1761C21.8063 14.1316 22.1401 14.1069 22.4789 14.1032V16.5284L25.9935 12.9942L22.4789 9.45729L22.4789 12.1031Z" fill="white"/>` +
    `</g></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 16, grab`
}

// Cache per whole-degree so pan / zoom re-renders don't re-encode the SVG.
const cursorCache = new Map<number, string>()
function rotateCursor(deg: number): string {
  const d = ((Math.round(deg) % 360) + 360) % 360
  let c = cursorCache.get(d)
  if (c === undefined) {
    c = makeRotateCursor(d)
    cursorCache.set(d, c)
  }
  return c
}

/**
 * Rotation handles — Figma-style. No visible rotate stem: an invisible
 * hotzone sits just outside each corner (beyond the resize handle), and
 * hovering it shows the rotate cursor. Rendered before the resize handles
 * so those still win the corner centre.
 */
export const RotationHandle: React.FC<Props> = ({ bbox, rotation = 0 }) => {
  const start = useRotateGesture()
  const scale = useEditorStore((s) => s.camera.scale)
  const hot = 18 / scale
  const o = 7 / scale

  // Base angle per corner (NW=0, NE=90, SE=180, SW=270) + the widget's own
  // rotation, so the cursor stays correctly oriented after rotating.
  const corners: Array<{ cx: number; cy: number; base: number }> = [
    { cx: bbox.x - o, cy: bbox.y - o, base: 0 }, // top-left (NW)
    { cx: bbox.x + bbox.width + o, cy: bbox.y - o, base: 90 }, // top-right (NE)
    { cx: bbox.x + bbox.width + o, cy: bbox.y + bbox.height + o, base: 180 }, // bottom-right (SE)
    { cx: bbox.x - o, cy: bbox.y + bbox.height + o, base: 270 }, // bottom-left (SW)
  ]

  return (
    <>
      {corners.map((c, i) => (
        <div
          key={i}
          onPointerDown={start}
          className="pointer-events-auto absolute touch-none"
          style={{
            left: c.cx - hot / 2,
            top: c.cy - hot / 2,
            width: hot,
            height: hot,
            cursor: rotateCursor(c.base + rotation),
          }}
        />
      ))}
    </>
  )
}
