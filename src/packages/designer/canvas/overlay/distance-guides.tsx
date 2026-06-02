import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useDocumentStore } from '../../stores/document-store'
import { useEditorStore } from '../../stores/editor-store'
import { selectCurrentPage, selectWidget, selectWidgets } from '../../stores/selectors'
import { rotatedAABB } from '../transformer/geometry'
import type { BBox } from '../transformer/geometry'

/**
 * Figma-style distance smart guides.
 *
 * Trigger:
 *   - exactly one widget selected;
 *   - hover lives on a *different* widget;
 *   - both rects' rotated AABBs computed in canvas space.
 *
 * Drawing rules:
 *   - When the rects overlap on the Y axis, draw two horizontal dashed
 *     lines (one on each side) with the gap distance in the middle.
 *   - Symmetric for X-axis overlap (vertical dashed lines, top + bottom).
 *   - When the rects don't overlap on either axis, draw an L-shaped
 *     bracket connecting the nearest corners and label two distances.
 *
 * All in pink (`text-pink-500`) so it never clashes with the blue
 * selection chrome or the orange alignment guides.
 */
export const DistanceGuides: React.FC = () => {
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const hoverId = useEditorStore((s) => s.hoverId)
  const interaction = useEditorStore((s) => s.interaction.kind)
  const scale = useEditorStore((s) => s.camera.scale)
  const showAlignmentGuides = useEditorStore((s) => s.view.showAlignmentGuides)
  // Only one selected, hovering elsewhere, and not currently dragging
  // (during a drag the alignment guides already show — adding distance
  // labels on top is noisy).
  const isEligible =
    showAlignmentGuides &&
    selectedIds.length === 1 &&
    !!hoverId &&
    hoverId !== selectedIds[0] &&
    interaction === 'idle'

  const a = useDocumentStore((s) =>
    isEligible ? selectWidget(selectedIds[0]!)(s) : null,
  )
  const b = useDocumentStore((s) => (isEligible ? selectWidget(hoverId!)(s) : null))
  const page = useDocumentStore((s) => selectCurrentPage(s))
  const all = useDocumentStore(useShallow((s) => (isEligible ? selectWidgets(s) : [])))

  if (!isEligible || !a || !b || !page) return null

  const ra = rotatedAABB(a)
  const rb = rotatedAABB(b)

  const stroke = Math.max(1 / scale, 0.5)
  const dash = `${4 / scale} ${3 / scale}`
  const fontSize = 10 / scale
  const padX = 3 / scale
  const padY = 1 / scale
  const color = '#ec4899' // tailwind pink-500 — distinct from selection/snap

  const segments = computeSegments(ra, rb)
  // Equal-spacing hint: if `a` is equidistant from a third widget on the
  // opposite side, surface that gap too so the two equal gaps read as "equal".
  const others = all.filter((w) => w.id !== a.id && w.id !== b.id).map(rotatedAABB)
  segments.push(...findEqualSpacing(ra, rb, others))

  return (
    <svg
      data-skip-snapshot
      className="pointer-events-none absolute top-0 left-0 overflow-visible"
      style={{ width: page.canvas.width, height: page.canvas.height }}
    >
      {segments.map((seg, i) => (
        <React.Fragment key={i}>
          <line
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={dash}
          />
          {/* Label centered on the segment midpoint. */}
          <g
            transform={`translate(${(seg.x1 + seg.x2) / 2}, ${
              (seg.y1 + seg.y2) / 2
            })`}
          >
            <rect
              x={-(seg.label.length * fontSize * 0.32 + padX)}
              y={-fontSize * 0.7 - padY}
              width={seg.label.length * fontSize * 0.64 + padX * 2}
              height={fontSize * 1.4 + padY * 2}
              rx={2 / scale}
              fill={color}
            />
            <text
              x={0}
              y={fontSize * 0.35}
              fill="white"
              fontSize={fontSize}
              textAnchor="middle"
              fontWeight={500}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {seg.label}
            </text>
          </g>
        </React.Fragment>
      ))}
    </svg>
  )
}

interface Segment {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
}

function computeSegments(a: BBox, b: BBox): Segment[] {
  const overlapX = !(a.x + a.width <= b.x || b.x + b.width <= a.x)
  const overlapY = !(a.y + a.height <= b.y || b.y + b.height <= a.y)
  const segs: Segment[] = []

  if (overlapY) {
    // Same row → horizontal gap label.
    const midY = Math.max(a.y, b.y) + Math.min(a.y + a.height, b.y + b.height)
    const y = midY / 2
    if (a.x + a.width <= b.x) {
      const gap = Math.round(b.x - (a.x + a.width))
      segs.push({ x1: a.x + a.width, y1: y, x2: b.x, y2: y, label: `${gap}` })
    } else if (b.x + b.width <= a.x) {
      const gap = Math.round(a.x - (b.x + b.width))
      segs.push({ x1: b.x + b.width, y1: y, x2: a.x, y2: y, label: `${gap}` })
    }
  }
  if (overlapX) {
    const midX =
      Math.max(a.x, b.x) + Math.min(a.x + a.width, b.x + b.width)
    const x = midX / 2
    if (a.y + a.height <= b.y) {
      const gap = Math.round(b.y - (a.y + a.height))
      segs.push({ x1: x, y1: a.y + a.height, x2: x, y2: b.y, label: `${gap}` })
    } else if (b.y + b.height <= a.y) {
      const gap = Math.round(a.y - (b.y + b.height))
      segs.push({ x1: x, y1: b.y + b.height, x2: x, y2: a.y, label: `${gap}` })
    }
  }

  if (segs.length === 0 && !overlapX && !overlapY) {
    // Off-axis: draw an L bracket from the nearest corners — one
    // horizontal segment and one vertical segment.
    const fromRight = a.x + a.width <= b.x
    const fromBottom = a.y + a.height <= b.y
    const aRightX = fromRight ? a.x + a.width : a.x
    const bLeftX = fromRight ? b.x : b.x + b.width
    const aBottomY = fromBottom ? a.y + a.height : a.y
    const bTopY = fromBottom ? b.y : b.y + b.height
    const hGap = Math.abs(bLeftX - aRightX)
    const vGap = Math.abs(bTopY - aBottomY)
    // Horizontal segment at b.top edge level.
    segs.push({
      x1: aRightX,
      y1: bTopY,
      x2: bLeftX,
      y2: bTopY,
      label: `${Math.round(hGap)}`,
    })
    // Vertical segment at a.right edge level.
    segs.push({
      x1: aRightX,
      y1: aBottomY,
      x2: aRightX,
      y2: bTopY,
      label: `${Math.round(vGap)}`,
    })
  }

  return segs
}

/**
 * If the selected rect `a` is the same distance from a third widget on the
 * opposite side as it is from the hovered rect `b`, return that third gap as
 * a Segment — rendered alongside the a–b gap, the two equal-length bars read
 * as an "equal spacing" hint.
 */
function findEqualSpacing(a: BBox, b: BBox, others: BBox[]): Segment[] {
  const TOL = 1 // canvas px — treat gaps within 1px as equal
  const overlapY = !(a.y + a.height <= b.y || b.y + b.height <= a.y)
  const overlapX = !(a.x + a.width <= b.x || b.x + b.width <= a.x)
  const out: Segment[] = []

  if (overlapY && !overlapX) {
    const bRight = b.x >= a.x + a.width
    const gapB = bRight ? b.x - (a.x + a.width) : a.x - (b.x + b.width)
    if (gapB <= 0) return out
    let best: { r: BBox; gap: number } | null = null
    for (const r of others) {
      if (a.y + a.height <= r.y || r.y + r.height <= a.y) continue // not same row
      const onLeft = r.x + r.width <= a.x
      const onRight = r.x >= a.x + a.width
      if (bRight ? !onLeft : !onRight) continue // must be opposite side from b
      const gapC = bRight ? a.x - (r.x + r.width) : r.x - (a.x + a.width)
      if (gapC <= 0) continue
      if (!best || gapC < best.gap) best = { r, gap: gapC }
    }
    if (best && Math.abs(best.gap - gapB) <= TOL) {
      const y =
        (Math.max(a.y, best.r.y) + Math.min(a.y + a.height, best.r.y + best.r.height)) / 2
      const label = `${Math.round(best.gap)}`
      if (bRight) out.push({ x1: best.r.x + best.r.width, y1: y, x2: a.x, y2: y, label })
      else out.push({ x1: a.x + a.width, y1: y, x2: best.r.x, y2: y, label })
    }
  } else if (overlapX && !overlapY) {
    const bBelow = b.y >= a.y + a.height
    const gapB = bBelow ? b.y - (a.y + a.height) : a.y - (b.y + b.height)
    if (gapB <= 0) return out
    let best: { r: BBox; gap: number } | null = null
    for (const r of others) {
      if (a.x + a.width <= r.x || r.x + r.width <= a.x) continue // not same column
      const above = r.y + r.height <= a.y
      const below = r.y >= a.y + a.height
      if (bBelow ? !above : !below) continue
      const gapC = bBelow ? a.y - (r.y + r.height) : r.y - (a.y + a.height)
      if (gapC <= 0) continue
      if (!best || gapC < best.gap) best = { r, gap: gapC }
    }
    if (best && Math.abs(best.gap - gapB) <= TOL) {
      const x =
        (Math.max(a.x, best.r.x) + Math.min(a.x + a.width, best.r.x + best.r.width)) / 2
      const label = `${Math.round(best.gap)}`
      if (bBelow) out.push({ x1: x, y1: best.r.y + best.r.height, x2: x, y2: a.y, label })
      else out.push({ x1: x, y1: a.y + a.height, x2: x, y2: best.r.y, label })
    }
  }
  return out
}
