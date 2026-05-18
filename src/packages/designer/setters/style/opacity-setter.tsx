import * as React from 'react'
import type { SetterProps } from '../setter.interface'
import { SliderSetter } from '../basic/slider-setter'

/**
 * Convenience setter: 0..1 opacity rendered as a 0..100% slider.
 */
export const OpacitySetter: React.FC<SetterProps<number>> = (props) => {
  const v = typeof props.value === 'number' ? props.value : 1
  return (
    <SliderSetter
      {...props}
      value={Math.round(v * 100)}
      setterProps={{ min: 0, max: 100, step: 1, unit: '%', showInput: true }}
      onChange={(percent) => props.onChange(Math.max(0, Math.min(1, percent / 100)))}
    />
  )
}
