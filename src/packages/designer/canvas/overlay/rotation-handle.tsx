import * as React from 'react'
import { useEditorStore } from '../../stores/editor-store'
import { useRotateGesture } from '../interaction/use-rotate-gesture'

interface Props {
  bbox: { x: number; y: number; width: number; height: number }
}

/**
 * Build a Figma-style rotation cursor: a curved double-headed arrow (white
 * halo + black body so it reads on any background), rotated by `deg` so each
 * corner points "around" the box. Falls back to `grab` where SVG cursors
 * aren't supported.
 */
function makeRotateCursor(deg: number): string {
  // Upper semicircle arc with a small arrowhead at each end — the classic
  // "rotate" glyph, not the circular refresh icon.
  const shape =
    `<path d="M6 12 A6 6 0 0 1 18 12" fill="none"/>` +
    `<path d="M6 16.5 L2.5 11.5 L9.5 11.5 Z"/>` +
    `<path d="M18 16.5 L14.5 11.5 L21.5 11.5 Z"/>`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24">` +
    `<g transform="rotate(${deg} 12 12)" stroke-linejoin="round" stroke-linecap="round">` +
    `<g fill="white" stroke="white" stroke-width="3.5">${shape}</g>` +
    `<g fill="black" stroke="black" stroke-width="1.5">${shape}</g>` +
    `</g></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 13 13, grab`
}

// Pre-generated per-corner cursors (module-level — no per-render encode).
// Each corner's arrow points along the tangent of rotation at that corner.
const CURSOR: Record<number, string> = {
  45: makeRotateCursor(45),
  135: makeRotateCursor(135),
  225: makeRotateCursor(225),
  315: makeRotateCursor(315),
}

/**
 * Rotation handles — Figma-style. There is NO visible rotate stem; instead
 * an invisible hotzone sits just outside each of the four corners (beyond
 * the resize handle), and hovering it shows the rotate cursor. Rendered
 * before the resize handles so those still win the corner centre.
 */
export const RotationHandle: React.FC<Props> = ({ bbox }) => {
  const start = useRotateGesture()
  const scale = useEditorStore((s) => s.camera.scale)
  // Hotzone size + how far its centre sits diagonally outside the corner.
  const hot = 18 / scale
  const o = 7 / scale

  const corners: Array<{ cx: number; cy: number; cursor: string }> = [
    { cx: bbox.x - o, cy: bbox.y - o, cursor: CURSOR[315] }, // top-left
    { cx: bbox.x + bbox.width + o, cy: bbox.y - o, cursor: CURSOR[45] }, // top-right
    { cx: bbox.x + bbox.width + o, cy: bbox.y + bbox.height + o, cursor: CURSOR[135] }, // bottom-right
    { cx: bbox.x - o, cy: bbox.y + bbox.height + o, cursor: CURSOR[225] }, // bottom-left
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
            cursor: c.cursor,
          }}
        />
      ))}
    </>
  )
}
