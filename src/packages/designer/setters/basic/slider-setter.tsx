import * as React from 'react'
import { Slider } from '~/components/ui/slider'
import { NumInput } from '../../ui/property-controls'
import type { SetterProps } from '../setter.interface'

interface SliderSetterProps {
  min?: number
  max?: number
  step?: number
  /** Show numeric input alongside the slider. Defaults to true. */
  showInput?: boolean
  /** Suffix shown inside the numeric input (e.g. 'px', '%'). */
  unit?: string
}

/**
 * Slider + small numeric input. The slider is shadcn (radix) — it has solid
 * keyboard / pointer support out of the box. The number box uses the
 * design-system NumInput so it visually pairs with other property fields.
 */
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
  const showInput = opts.showInput !== false

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
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
      {showInput && (
        <NumInput
          value={v}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
          width={56}
          suffix={opts.unit}
          disabled={disabled}
        />
      )}
    </div>
  )
}
