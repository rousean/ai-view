import * as React from 'react'
import { NumInput } from '../../ui/property-controls'
import type { SetterProps } from '../setter.interface'

interface NumberSetterProps {
  min?: number
  max?: number
  step?: number
  /** Suffix shown inside the input (e.g. 'px', '%', 's'). */
  unit?: string
  /** Prefix shown inside the input (e.g. 'W', 'H', 'X'). */
  prefix?: string
}

/** Thin wrapper around the design-system NumInput so setter consumers
 *  go through the same primitive as the canvas property panel. */
export const NumberSetter: React.FC<SetterProps<number>> = ({
  value,
  onChange,
  setterProps,
  disabled,
}) => {
  const opts = (setterProps ?? {}) as NumberSetterProps
  return (
    <NumInput
      value={typeof value === 'number' ? value : 0}
      onChange={onChange}
      min={opts.min}
      max={opts.max}
      step={opts.step}
      prefix={opts.prefix}
      suffix={opts.unit}
      disabled={disabled}
    />
  )
}

export type { NumberSetterProps }
