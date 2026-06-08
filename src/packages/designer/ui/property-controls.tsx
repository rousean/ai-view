import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible'
import { Separator } from '~/components/ui/separator'
import { Switch } from '~/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
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
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/section">
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between bg-transparent px-3 pt-2.5 pb-2 font-[inherit]">
        <span className="text-muted-foreground/80 text-[11px] font-semibold tracking-wide uppercase">
          {title}
        </span>
        <ChevronDown
          size={12}
          className="text-muted-foreground/80 transition-transform duration-150 group-data-[state=closed]/section:-rotate-90"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-2">{children}</CollapsibleContent>
      <Separator />
    </Collapsible>
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
  const clamp = React.useCallback(
    (n: number) => {
      if (typeof min === 'number' && n < min) return min
      if (typeof max === 'number' && n > max) return max
      return n
    },
    [min, max],
  )
  const commit = (raw: string) => {
    const n = parseNumericExpression(raw, value)
    if (Number.isFinite(n)) onChange?.(clamp(n))
    else setText(formatNumber(value))
  }
  const bump = (delta: number) => {
    const base = Number.isFinite(value) ? (value as number) : 0
    onChange?.(clamp(base + delta))
  }
  // Scrub: pointer-down on the prefix label, drag horizontally → +/-.
  // Matches Figma's "drag the X/Y label to scrub the value" idiom.
  const prefixLabel = prefix ? (
    <ScrubHandle
      label={prefix}
      disabled={disabled || !onChange}
      onScrub={(delta) => bump(delta)}
    />
  ) : null
  return (
    <PropInput disabled={disabled} style={{ width }}>
      {prefixLabel}
      <input
        type="text"
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        // Native title doubles as the keyboard-shortcut hint — Figma
        // users expect ↑↓ for ±1 / Shift+↑↓ for ±10 / dragging the prefix
        // label for scrubbing. We don't ship a custom Tooltip because
        // the property panel is dense and an extra popover would
        // obscure neighbouring rows during fast iteration.
        title="↑↓ ±1 · Shift ↑↓ ±10 · 拖动前/后缀标签连续调整"
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit((e.target as HTMLInputElement).value)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            bump(e.shiftKey ? 10 : 1)
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            bump(e.shiftKey ? -10 : -1)
          }
        }}
        min={min}
        max={max}
        step={step}
        className="text-foreground placeholder:text-muted-foreground/60 w-full border-none bg-transparent text-[11px] tabular-nums outline-none"
      />
      {suffix && (
        <ScrubHandle
          label={suffix}
          disabled={disabled || !onChange}
          onScrub={(delta) => bump(delta)}
        />
      )}
    </PropInput>
  )
}

/**
 * Drag-to-scrub label. Pointer-down + horizontal drag emits a delta
 * proportional to the mouse movement. 1px ≈ 1 unit by default;
 * Shift = 10× faster, Alt = 0.1× for fine control. Used as the prefix
 * inside NumInput when a `prefix` string is provided.
 */
function ScrubHandle({
  label,
  disabled,
  onScrub,
}: {
  label: string
  disabled: boolean
  onScrub: (delta: number) => void
}) {
  const startRef = React.useRef<{ x: number; accumulated: number } | null>(null)

  return (
    <span
      className={cn(
        'text-muted-foreground/80 shrink-0 cursor-ew-resize text-[11px] select-none',
        disabled && 'cursor-default',
      )}
      onPointerDown={(e) => {
        if (disabled) return
        e.preventDefault()
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        startRef.current = { x: e.clientX, accumulated: 0 }
      }}
      onPointerMove={(e) => {
        if (!startRef.current) return
        const dx = e.clientX - startRef.current.x
        const step = e.shiftKey ? 10 : e.altKey ? 0.1 : 1
        // Integer-snapping the emitted delta keeps undo entries clean:
        // we only fire when at least one whole step's worth has built up.
        const next = Math.trunc(dx * step)
        const emit = next - startRef.current.accumulated
        if (emit !== 0) {
          startRef.current.accumulated = next
          onScrub(emit)
        }
      }}
      onPointerUp={() => {
        startRef.current = null
      }}
    >
      {label}
    </span>
  )
}

/**
 * Parse a NumInput value. Accepts plain numbers and tiny arithmetic
 * expressions made of digits, `. + - * / ( )`. Anything else falls
 * back to the previous value. Sandboxed via Function — the regex
 * whitelist makes it safe to evaluate user input.
 */
function parseNumericExpression(raw: string, fallback: number | undefined): number {
  const trimmed = raw.trim()
  if (!trimmed) return Number.NaN
  // Fast path: plain number (with optional unit suffix like "px" or "%"
  // — for now we just strip them; semantic unit handling is out of scope).
  const cleaned = trimmed.replace(/(px|deg|%)$/i, '')
  const plain = Number(cleaned)
  if (Number.isFinite(plain)) return plain
  // Expression path. Whitelist the allowed character set so we can run
  // it through `new Function` without opening eval.
  if (!/^[\d\s+\-*/().]+$/.test(cleaned)) {
    return fallback ?? Number.NaN
  }
  try {
    const value = new Function(`"use strict"; return (${cleaned});`)() as unknown
    if (typeof value === 'number' && Number.isFinite(value)) return value
  } catch {
    // fall through
  }
  return fallback ?? Number.NaN
}

function formatNumber(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return ''
  // Cap to 2 decimal places without trailing zeros.
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
}

/** Property-panel switch — shadcn `Switch` at its compact `sm` size. */
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
    <Switch
      size="sm"
      checked={on}
      disabled={disabled}
      onCheckedChange={(next) => onChange?.(next)}
    />
  )
}

/** Inline radio-like segmented control — shadcn `ToggleGroup` (single). */
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
    <ToggleGroup
      type="single"
      size="sm"
      value={value}
      onValueChange={(next) => {
        // Radix emits '' when the active item is toggled off; keep it a
        // required single-select by ignoring the empty value.
        if (next) onChange?.(next as T)
      }}
      className="gap-1"
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-6 cursor-pointer px-2 text-[11px] data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
