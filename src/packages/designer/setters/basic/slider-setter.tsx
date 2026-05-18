import * as React from 'react'
import { Input } from '~/components/ui/input'
import { Slider } from '~/components/ui/slider'
import type { SetterProps } from '../setter.interface'

interface SliderSetterProps {
  min?: number
  max?: number
  step?: number
  /** Show numeric input alongside the slider. Defaults to true. */
  showInput?: boolean
  unit?: string
}

export const SliderSetter: React.FC<SetterProps<number>> = ({
  value,
  onChange,
  setterProps,
  disabled,
}) => {
  const opts = (setterProps ?? {}) as SliderSetterProps
  const min = opts.min ?? 0
  const max = opts.max ?? 100
  const step = opts.step ?? 1
  const v = typeof value === 'number' ? value : min

  return (
    <div className="flex items-center gap-3">
      <Slider
        className="flex-1"
        min={min}
        max={max}
        step={step}
        value={[v]}
        disabled={disabled}
        onValueChange={(next) => {
          const n = next[0]
          if (Number.isFinite(n)) onChange(n)
        }}
      />
      {opts.showInput !== false && (
        <Input
          type="number"
          className="h-7 w-16 px-2 text-xs"
          value={v}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n)) onChange(n)
          }}
        />
      )}
      {opts.unit && <span className="shrink-0 text-xs text-muted-foreground">{opts.unit}</span>}
    </div>
  )
}
