import * as React from 'react'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import type { SetterProps } from '../setter.interface'

interface StringSetterProps {
  placeholder?: string
  multiline?: boolean
  maxLength?: number
  rows?: number
}

/**
 * String input — shadcn `Input` / `Textarea`, styled to the property
 * panel's compact row (bg-muted, 26px / 60px min, 11px).
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
      <Textarea
        className="min-h-[60px] resize-y border-transparent bg-muted px-2 py-1.5 text-[11px]"
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
    <Input
      className="h-[26px] border-transparent bg-muted px-1.5 text-[11px]"
      value={v}
      placeholder={opts.placeholder}
      maxLength={opts.maxLength}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
