import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { Separator } from '~/components/ui/separator'
import { cn } from '~/lib/utils'

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
        className="flex w-full cursor-pointer items-center justify-between bg-transparent px-3 pt-2.5 pb-2 font-[inherit]"
      >
        <span className="text-muted-foreground/80 text-[11px] font-semibold tracking-wide uppercase">
          {title}
        </span>
        <ChevronDown
          size={12}
          className="text-muted-foreground/80 transition-transform duration-150"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
      </button>
      {open && <div className="pb-2">{children}</div>}
      <Separator />
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
    <div className="flex min-h-7 items-center gap-2 px-3 py-1">
      <div className="text-muted-foreground/80 w-14 shrink-0 text-[11px]">{label}</div>
      <div className="flex min-w-0 flex-1 items-center gap-1">{children}</div>
    </div>
  )
}

/**
 * Shared chrome for a single-row inline property input. Matches the height
 * + background + focus treatment used by NumInput / ColorInput / setters.
 */
export function PropInput({
  className,
  style,
  children,
  disabled,
}: {
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div
      data-disabled={disabled || undefined}
      className={cn(
        'bg-muted hover:bg-muted/80 focus-within:bg-card focus-within:border-primary flex h-[26px] min-w-0 items-center rounded-sm border border-transparent px-1.5 text-[11px] transition-colors',
        disabled && 'opacity-50',
        className,
      )}
      style={style}
    >
      {children}
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
  placeholder = '—',
}: {
  /** `undefined` renders blank with the placeholder — used for "mixed" values in batch edit. */
  value?: number
  onChange?: (n: number) => void
  prefix?: string
  suffix?: string
  width?: number | string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  placeholder?: string
}) {
  const [text, setText] = React.useState(formatNumber(value))
  React.useEffect(() => setText(formatNumber(value)), [value])
  const commit = (raw: string) => {
    const n = Number(raw)
    if (Number.isFinite(n)) onChange?.(n)
    else setText(formatNumber(value))
  }
  return (
    <PropInput disabled={disabled} style={{ width }}>
      {prefix && (
        <span className="text-muted-foreground/80 shrink-0 text-[11px]">{prefix}</span>
      )}
      <input
        type="text"
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit((e.target as HTMLInputElement).value)
        }}
        min={min}
        max={max}
        step={step}
        className="text-foreground placeholder:text-muted-foreground/60 w-full border-none bg-transparent text-[11px] tabular-nums outline-none"
      />
      {suffix && (
        <span className="text-muted-foreground/80 shrink-0 text-[11px]">{suffix}</span>
      )}
    </PropInput>
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
    <PropInput className="gap-1.5">
      <label
        className={cn(
          'h-3.5 w-3.5 shrink-0 rounded-[3px] ring-1 ring-black/10',
          onChange ? 'cursor-pointer' : 'cursor-default',
        )}
        style={{ background: v }}
      >
        {onChange && (
          <input
            type="color"
            value={v.startsWith('#') ? v.slice(0, 7) : v}
            onChange={(e) => onChange(e.target.value)}
            className="absolute h-0 w-0 opacity-0"
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
        className="text-foreground flex-1 border-none bg-transparent text-[11px] outline-none"
      />
    </PropInput>
  )
}

function hexLabel(c: string) {
  return c.replace('#', '').toUpperCase()
}

function formatNumber(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return ''
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
      className={cn(
        'flex h-4 w-7 items-center rounded-lg p-0.5 transition-colors duration-150',
        on ? 'bg-primary' : 'bg-input',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      )}
    >
      <span
        className="block h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-150"
        style={{ transform: on ? 'translateX(12px)' : 'translateX(0)' }}
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
    <div className="flex gap-1">
      {options.map((o) => {
        const isSel = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange?.(o.value)}
            className={cn(
              'h-6 cursor-pointer rounded-sm px-2 text-[11px] transition-colors',
              isSel
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
