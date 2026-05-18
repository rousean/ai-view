import * as React from 'react'
import { ChevronDown } from 'lucide-react'
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
 * Dropdown styled to match the design's `.prop-input` row. Uses the native
 * `<select>` element so we get the OS-level keyboard + screen reader support
 * for free — for longer lists or rich items we can later swap to a Popover
 * implementation without changing the SetterRegistry contract.
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
      className="prop-input"
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        paddingRight: 4,
      }}
    >
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          width: '100%',
          fontFamily: 'inherit',
          fontSize: 11,
          color: 'var(--text-1)',
          cursor: 'inherit',
        }}
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
      <ChevronDown size={12} style={{ color: 'var(--text-3)', pointerEvents: 'none' }} />
    </label>
  )
}
