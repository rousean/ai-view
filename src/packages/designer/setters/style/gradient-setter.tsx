import * as React from 'react'
import type { WidgetNode } from '@schema/types'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { cn } from '~/lib/utils'
import type { DashboardEditor } from '../../editor/dashboard-editor'
import { NumInput, PropInput } from '../../ui/property-controls'
import { ColorSetter } from './color-setter'
import type { SetterProps } from '../setter.interface'

/**
 * Linear gradient — two colour stops + angle. Sufficient for the 80% of
 * dashboard widget fill cases (bar fill, area fill, ring fill). The
 * setter exposes a single value object so charts read it as one prop:
 *
 *   { type: 'linear', stops: [{ offset: 0, color }, { offset: 1, color }], angle }
 *
 * For widgets that still want a solid colour, we accept a plain hex
 * string as `value` and treat it as "no gradient, use solid"; the
 * pickers create a real gradient object on first interaction.
 */
export interface LinearGradientValue {
  type: 'linear'
  angle: number
  stops: Array<{ offset: number; color: string }>
}

/** Either a solid colour string or a structured gradient. */
export type GradientFieldValue = string | LinearGradientValue

const DEFAULT_VALUE: LinearGradientValue = {
  type: 'linear',
  angle: 180,
  stops: [
    { offset: 0, color: '#0D99FF' },
    { offset: 1, color: '#00D4FF' },
  ],
}

function normalize(value: GradientFieldValue | undefined): LinearGradientValue {
  if (!value || typeof value === 'string') {
    return {
      type: 'linear',
      angle: 180,
      stops: [
        { offset: 0, color: value || DEFAULT_VALUE.stops[0]!.color },
        { offset: 1, color: DEFAULT_VALUE.stops[1]!.color },
      ],
    }
  }
  return value
}

export const GradientSetter: React.FC<SetterProps<GradientFieldValue>> = ({
  value,
  onChange,
  disabled,
  context,
}) => {
  const g = normalize(value)
  const start = g.stops[0]!.color
  const end = g.stops[g.stops.length - 1]!.color

  const patch = (next: Partial<LinearGradientValue>) =>
    onChange({ ...g, ...next })

  // ColorSetter requires a context. We forward the outer one — gradient
  // is a thin composite of two ColorSetter instances and doesn't need
  // a separate one.
  const passthrough: { node: WidgetNode; editor: DashboardEditor } | undefined = context

  // Live preview swatch — CSS linear-gradient mirrors the angle convention
  // we use elsewhere (180 ≡ top→bottom).
  const previewBg = `linear-gradient(${g.angle}deg, ${start}, ${end})`

  return (
    <PropInput className="gap-1.5" disabled={disabled}>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="编辑渐变"
            className={cn(
              'h-3.5 w-7 shrink-0 rounded-[3px] ring-1 ring-black/10',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
            style={{ background: previewBg }}
          />
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={4} className="w-64 space-y-2 p-3">
          <div className="text-muted-foreground/80 text-[11px]">起始色</div>
          <ColorSetter
            value={start}
            onChange={(c) =>
              patch({
                stops: [
                  { offset: 0, color: c as string },
                  { offset: 1, color: end },
                ],
              })
            }
            context={passthrough}
            setterProps={undefined}
          />
          <div className="text-muted-foreground/80 text-[11px]">终止色</div>
          <ColorSetter
            value={end}
            onChange={(c) =>
              patch({
                stops: [
                  { offset: 0, color: start },
                  { offset: 1, color: c as string },
                ],
              })
            }
            context={passthrough}
            setterProps={undefined}
          />
          <div className="text-muted-foreground/80 text-[11px]">角度</div>
          <NumInput
            value={g.angle}
            suffix="°"
            min={0}
            max={360}
            onChange={(a) => patch({ angle: a })}
          />
        </PopoverContent>
      </Popover>
      <span className="text-foreground/80 truncate text-[11px]">
        {start.toUpperCase()} → {end.toUpperCase()}
      </span>
      <span className="text-muted-foreground/60 shrink-0 text-[11px] tabular-nums">
        {g.angle}°
      </span>
    </PropInput>
  )
}
