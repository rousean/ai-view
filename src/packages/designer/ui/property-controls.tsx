import * as React from 'react'
import { ChevronDown } from 'lucide-react'

/** Collapsible section in the property panel. Mirrors the design's PropSection. */
export function PropSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '10px 12px 8px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <span className="section-label" style={{ padding: 0 }}>
          {title}
        </span>
        <ChevronDown
          size={12}
          style={{
            color: 'var(--text-3)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform .15s',
          }}
        />
      </button>
      {open && <div style={{ paddingBottom: 8 }}>{children}</div>}
      <div className="divider-h" />
    </div>
  )
}

/** A labelled row inside a PropSection. */
export function PropRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="prop-row">
      <div className="prop-label">{label}</div>
      <div className="prop-control">{children}</div>
    </div>
  )
}

/** Numeric input with optional prefix/suffix label inside the box. */
export function NumInput({
  value,
  onChange,
  prefix,
  suffix,
  width,
  min,
  max,
  step,
  disabled,
}: {
  value: number
  onChange?: (n: number) => void
  prefix?: string
  suffix?: string
  width?: number | string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}) {
  const [text, setText] = React.useState(formatNumber(value))
  React.useEffect(() => setText(formatNumber(value)), [value])
  const commit = (raw: string) => {
    const n = Number(raw)
    if (Number.isFinite(n)) onChange?.(n)
    else setText(formatNumber(value))
  }
  return (
    <div
      className="prop-input"
      style={{ width, opacity: disabled ? 0.5 : undefined }}
      data-disabled={disabled || undefined}
    >
      {prefix && <span className="prop-prefix">{prefix}</span>}
      <input
        type="text"
        inputMode="decimal"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit((e.target as HTMLInputElement).value)
        }}
        min={min}
        max={max}
        step={step}
      />
      {suffix && <span className="prop-prefix">{suffix}</span>}
    </div>
  )
}

/** Color swatch + hex input (read-only stub for now). */
export function ColorInput({
  value,
  onChange,
}: {
  value: string
  onChange?: (v: string) => void
}) {
  const v = typeof value === 'string' && value.length > 0 ? value : '#000000'
  const [text, setText] = React.useState(hexLabel(v))
  React.useEffect(() => setText(hexLabel(v)), [v])
  return (
    <div className="prop-input" style={{ gap: 6 }}>
      <label className="swatch" style={{ background: v, cursor: onChange ? 'pointer' : 'default' }}>
        {onChange && (
          <input
            type="color"
            value={v.startsWith('#') ? v.slice(0, 7) : v}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
          />
        )}
      </label>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (/^[0-9a-fA-F]{3,8}$/.test(text)) onChange?.('#' + text.toUpperCase())
          else setText(hexLabel(v))
        }}
        style={{ flex: 1 }}
      />
    </div>
  )
}

function hexLabel(c: string) {
  return c.replace('#', '').toUpperCase()
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return ''
  // Cap to 2 decimal places without trailing zeros.
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
}

/** Tiny custom toggle matching the design (28×16 pill). */
export function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean
  onChange?: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      style={{
        width: 28,
        height: 16,
        borderRadius: 8,
        border: 'none',
        padding: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: on ? 'var(--accent)' : 'var(--border-strong)',
        transition: 'background .15s',
        display: 'flex',
        alignItems: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          background: '#fff',
          transform: on ? 'translateX(12px)' : 'translateX(0)',
          transition: 'transform .15s',
          boxShadow: '0 1px 2px rgba(0,0,0,.2)',
        }}
      />
    </button>
  )
}

/** Inline radio-like segmented button group. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange?: (next: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map((o) => {
        const isSel = value === o.value
        return (
          <button
            key={o.value}
            className="btn"
            onClick={() => onChange?.(o.value)}
            style={{
              height: 24,
              fontSize: 11,
              padding: '0 8px',
              background: isSel ? 'var(--accent-soft)' : 'transparent',
              color: isSel ? 'var(--accent)' : 'var(--text-2)',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
