import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '~/lib/utils'
import type { SetterProps } from '../setter.interface'

export interface SelectOption {
  value: string
  label: string
}

interface SelectSetterProps {
  options?: SelectOption[]
  placeholder?: string
}

/**
 * Dropdown styled to match the rest of the property panel rows. Uses the
 * native `<select>` element so we get the OS-level keyboard + screen reader
 * support for free — for longer lists or rich items we can later swap to a
 * Popover implementation without changing the SetterRegistry contract.
 */
export const SelectSetter: React.FC<SetterProps<string>> = ({
  value,
  onChange,
  setterProps,
  disabled,
}) => {
  const opts = (setterProps ?? {}) as SelectSetterProps
  const options = opts.options ?? []
  return (
    <label
      data-disabled={disabled || undefined}
      className={cn(
        'bg-muted hover:bg-muted/80 focus-within:bg-card focus-within:border-primary flex h-[26px] min-w-0 items-center rounded-sm border border-transparent px-1.5 pr-1 text-[11px] transition-colors',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      )}
    >
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="text-foreground w-full cursor-[inherit] appearance-none border-none bg-transparent text-[11px] outline-none"
      >
        {opts.placeholder !== undefined && (
          <option value="" disabled>
            {opts.placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="text-muted-foreground/80 pointer-events-none" />
    </label>
  )
}
