import * as React from 'react'
import { Toggle } from '../../ui/property-controls'
import type { SetterProps } from '../setter.interface'

/** Wraps the Figma-style 28x16 pill toggle. */
export const BooleanSetter: React.FC<SetterProps<boolean>> = ({
  value,
  onChange,
  disabled,
}) => {
  return <Toggle on={!!value} disabled={disabled} onChange={(next) => onChange(next)} />
}
