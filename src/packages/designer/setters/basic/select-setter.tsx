import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
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
 * Dropdown — shadcn `Select` (radix), styled to the property panel's
 * compact row (bg-muted, 26px, 11px). Keyboard + screen-reader support
 * comes from radix; richer item rendering can be layered on later without
 * changing the SetterRegistry contract.
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
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        size="sm"
        className="h-[26px] w-full gap-1 border-transparent bg-muted px-1.5 text-[11px] font-normal"
      >
        <SelectValue placeholder={opts.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-[11px]">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
