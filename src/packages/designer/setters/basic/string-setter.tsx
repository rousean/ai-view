import * as React from 'react'
import { PropInput } from '../../ui/property-controls'
import type { SetterProps } from '../setter.interface'

interface StringSetterProps {
  placeholder?: string
  multiline?: boolean
  maxLength?: number
  rows?: number
}

/**
 * String input. Uses the shared `PropInput` chrome so it matches the
 * property-panel row treatment.
 */
export const StringSetter: React.FC<SetterProps<string>> = ({
  value,
  onChange,
  setterProps,
  disabled,
}) => {
  const opts = (setterProps ?? {}) as StringSetterProps
  const v = value ?? ''

  if (opts.multiline) {
    return (
      <textarea
        className="bg-muted hover:bg-muted/80 focus:bg-card focus:border-primary text-foreground min-h-[60px] w-full resize-y rounded-sm border border-transparent px-2 py-1.5 text-[11px] outline-none"
        rows={opts.rows ?? 3}
        value={v}
        placeholder={opts.placeholder}
        maxLength={opts.maxLength}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  return (
    <PropInput disabled={disabled}>
      <input
        value={v}
        placeholder={opts.placeholder}
        maxLength={opts.maxLength}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="text-foreground w-full border-none bg-transparent text-[11px] outline-none"
      />
    </PropInput>
  )
}
