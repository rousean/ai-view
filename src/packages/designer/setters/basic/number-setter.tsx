import * as React from 'react'
import { Input } from '~/components/ui/input'
import type { SetterProps } from '../setter.interface'

interface NumberSetterProps {
  min?: number
  max?: number
  step?: number
  unit?: string
  placeholder?: string
}

export const NumberSetter: React.FC<SetterProps<number>> = ({
  value,
  onChange,
  setterProps,
  disabled,
}) => {
  const opts = (setterProps ?? {}) as NumberSetterProps
  const v = typeof value === 'number' ? value : ''
  // Local text state so typing intermediate values (like "-" or "1.") doesn't
  // immediately commit; commit on blur / Enter.
  const [text, setText] = React.useState(String(v))

  React.useEffect(() => {
    setText(typeof value === 'number' ? String(value) : '')
  }, [value])

  const commit = (raw: string) => {
    const n = Number(raw)
    if (Number.isFinite(n)) onChange(n)
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={text}
        min={opts.min}
        max={opts.max}
        step={opts.step ?? 1}
        placeholder={opts.placeholder}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(text)
        }}
      />
      {opts.unit && <span className="shrink-0 text-xs text-muted-foreground">{opts.unit}</span>}
    </div>
  )
}
