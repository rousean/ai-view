import * as React from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import { usePalette } from '../../palette'
import { ColorSetter } from '../style/color-setter'
import type { SetterProps } from '../setter.interface'

/**
 * One row of the series list. We don't constrain consumers' value
 * shapes — the setter accepts any `{ id, name?, color? }`-ish item and
 * lets the form expose name + color generically. Anything richer
 * (smooth / area / per-series icon …) flows through props but isn't
 * editable here; widgets can either add a dedicated row later or open
 * a per-series detail popover. Keeping this lean means the same setter
 * works for line, bar (multi-series), scatter and area widgets without
 * a schema change.
 */
export interface SeriesItem {
  id: string
  name?: string
  color?: string
  [key: string]: unknown
}

interface SeriesListSetterProps {
  /** Newly-added rows get a generated id; this is the prefix. */
  idPrefix?: string
  /** Maximum rows allowed. Defaults to 12. */
  max?: number
}

/**
 * SeriesListSetter — sortable list of series objects.
 *
 *   ┌ ⋮⋮ [color] 系列 1                      🗑 ┐
 *   ┌ ⋮⋮ [color] 系列 2                      🗑 │
 *   ┌ ⋮⋮ [color] 系列 3                      🗑 │
 *   [+ 添加系列]
 *
 * Drag the `⋮⋮` handle to reorder; the setter commits the rearranged
 * array on drop. Per-row inline edits (rename, recolour, delete) commit
 * immediately. New rows are seeded with the next palette colour so the
 * chart stays visually coherent.
 */
export const SeriesListSetter: React.FC<SetterProps<SeriesItem[]>> = ({
  value,
  onChange,
  setterProps,
  disabled,
  context,
}) => {
  const opts = (setterProps ?? {}) as SeriesListSetterProps
  const list: SeriesItem[] = Array.isArray(value) ? value : []
  const max = opts.max ?? 12
  const idPrefix = opts.idPrefix ?? 'series'
  const palette = usePalette()

  // Drag state — tracked in React state so the placeholder line redraws.
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const [overIndex, setOverIndex] = React.useState<number | null>(null)
  const containerRef = React.useRef<HTMLUListElement | null>(null)

  const commit = (next: SeriesItem[]) => onChange(next)

  const patchAt = (idx: number, patch: Partial<SeriesItem>) => {
    const next = list.slice()
    next[idx] = { ...next[idx]!, ...patch }
    commit(next)
  }

  const removeAt = (idx: number) => {
    if (list.length <= 1) return // never let it drop to empty
    commit(list.filter((_, i) => i !== idx))
  }

  const add = () => {
    if (list.length >= max) return
    const nextIdx = list.length
    const fallbackColor = palette.series[nextIdx % palette.series.length] ?? '#0D99FF'
    commit([
      ...list,
      {
        id: makeSeriesId(idPrefix, list),
        name: `系列 ${nextIdx + 1}`,
        color: fallbackColor,
      },
    ])
  }

  // ── Drag bookkeeping ──────────────────────────────────────────────
  // We rely on the row's data-index attribute to find the "over" row
  // during pointermove; computing it from clientY each move is cheap
  // and avoids stale closures.
  const onPointerDown = (id: string) => (e: React.PointerEvent) => {
    if (disabled) return
    e.preventDefault()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setDraggingId(id)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !containerRef.current) return
    const rows = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('li[data-index]'),
    )
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!.getBoundingClientRect()
      if (e.clientY < r.top + r.height / 2) {
        setOverIndex(i)
        return
      }
    }
    setOverIndex(rows.length)
  }
  const onPointerUp = () => {
    if (draggingId && overIndex != null) {
      const fromIdx = list.findIndex((it) => it.id === draggingId)
      if (fromIdx >= 0) {
        let toIdx = overIndex
        // moving forward shifts target by 1 because the dragged item is
        // removed from its original slot first
        if (toIdx > fromIdx) toIdx -= 1
        if (toIdx !== fromIdx) {
          const next = list.slice()
          const [moved] = next.splice(fromIdx, 1)
          next.splice(toIdx, 0, moved!)
          commit(next)
        }
      }
    }
    setDraggingId(null)
    setOverIndex(null)
  }

  if (list.length === 0) {
    return (
      <div className="text-muted-foreground/60 px-1 py-1.5 text-[11px]">
        暂无系列 ·
        <button onClick={add} className="text-primary ml-1 cursor-pointer hover:underline">
          添加一个
        </button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <ul
        ref={containerRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="space-y-0.5"
      >
        {list.map((item, idx) => {
          const isDragging = item.id === draggingId
          return (
            <React.Fragment key={item.id}>
              {draggingId && overIndex === idx && !isDragging && (
                <li className="bg-primary/40 mx-2 h-px" aria-hidden />
              )}
              <li
                data-index={idx}
                className={cn(
                  'group/series hover:bg-muted/40 flex items-center gap-1 rounded px-1 py-0.5',
                  isDragging && 'opacity-50',
                )}
              >
                <button
                  type="button"
                  onPointerDown={onPointerDown(item.id)}
                  className="text-muted-foreground/60 hover:text-foreground shrink-0 cursor-grab touch-none active:cursor-grabbing"
                  aria-label="拖拽排序"
                  disabled={disabled}
                >
                  <GripVertical size={11} />
                </button>
                <span className="text-muted-foreground/60 w-3 shrink-0 text-center font-mono text-[9px]">
                  {idx + 1}
                </span>
                <div className="w-16 shrink-0">
                  <ColorSetter
                    value={(item.color as string) ?? '#0D99FF'}
                    onChange={(c) => patchAt(idx, { color: c as string })}
                    context={context}
                    setterProps={undefined}
                    disabled={disabled}
                  />
                </div>
                <input
                  value={(item.name as string) ?? ''}
                  onChange={(e) => patchAt(idx, { name: e.target.value })}
                  placeholder={`系列 ${idx + 1}`}
                  disabled={disabled}
                  className="text-foreground placeholder:text-muted-foreground/60 bg-muted hover:bg-muted/80 focus:bg-card focus:border-primary h-6 min-w-0 flex-1 rounded-sm border border-transparent px-1.5 text-[11px] outline-none"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={disabled || list.length <= 1}
                      onClick={() => removeAt(idx)}
                      aria-label={`删除系列 ${idx + 1}`}
                      className="text-muted-foreground/60 hover:text-destructive opacity-0 group-hover/series:opacity-100"
                    >
                      <Trash2 size={10} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>删除系列</TooltipContent>
                </Tooltip>
              </li>
            </React.Fragment>
          )
        })}
        {draggingId && overIndex === list.length && (
          <li className="bg-primary/40 mx-2 h-px" aria-hidden />
        )}
      </ul>
      <Button
        variant="ghost"
        size="xs"
        disabled={disabled || list.length >= max}
        onClick={add}
        className="text-muted-foreground hover:text-foreground mt-1 w-full justify-center"
      >
        <Plus size={11} />
        <span className="ml-1">添加系列</span>
      </Button>
    </div>
  )
}

/**
 * Generate a stable id for a new series. We prefer numbered suffixes
 * over random hashes so series ids stay legible in JSON exports.
 */
function makeSeriesId(prefix: string, existing: SeriesItem[]): string {
  const used = new Set(existing.map((s) => s.id))
  let n = existing.length + 1
  while (used.has(`${prefix}-${n}`)) n += 1
  return `${prefix}-${n}`
}
