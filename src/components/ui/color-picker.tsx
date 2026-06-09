import * as React from 'react'
import { PipetteIcon } from 'lucide-react'
import { Slider } from 'radix-ui'
import { cn } from '~/lib/utils'

/**
 * Figma-style colour picker panel — saturation/value area + hue & alpha
 * sliders + hex/alpha inputs + optional eyedropper + preset swatches.
 *
 * Design ported from the Kibo UI / Figma color picker, but rewritten to be
 * dependency-free (no `color` package — inline HSV/RGB math below) and to
 * emit a plain CSS colour string (`#RRGGBB`, `rgba(...)`, or `transparent`)
 * so it drops into the existing string-based ColorSetter contract. The
 * controlled-value sync ignores the echo of its own `onChange` to avoid the
 * thumb jitter the original component had.
 *
 * Built on the radix-ui `Slider` primitive (already a project dependency).
 */

// ─── Colour math (dependency-free) ──────────────────────────────────

export interface RGBA {
  /** 0-255 */ r: number
  /** 0-255 */ g: number
  /** 0-255 */ b: number
  /** 0-1 */ a: number
}
export interface HSVA {
  /** 0-360 */ h: number
  /** 0-100 */ s: number
  /** 0-100 */ v: number
  /** 0-1 */ a: number
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  s /= 100
  v /= 100
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g] = [c, x]
  else if (h < 120) [r, g] = [x, c]
  else if (h < 180) [g, b] = [c, x]
  else if (h < 240) [g, b] = [x, c]
  else if (h < 300) [r, b] = [x, c]
  else [r, b] = [c, x]
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) }
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(max * 100) }
}

const hex2 = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')

/** RGBA → the most compact CSS string: hex when opaque, rgba() when not. */
export function rgbaToString(c: RGBA): string {
  if (c.a <= 0) return 'transparent'
  if (c.a >= 1) return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`.toUpperCase()
  const a = Math.round(c.a * 100) / 100
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${a})`
}

/** Parse a CSS colour string (hex 3/4/6/8, rgb/rgba, hsl/hsla, transparent). */
export function parseColor(input: string | undefined | null): RGBA | null {
  if (!input) return null
  const s = input.trim().toLowerCase()
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }

  let m = s.match(/^#?([0-9a-f]{3,8})$/)
  if (m) {
    let h = m[1]
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('')
    if (h.length === 6) {
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 }
    }
    if (h.length === 8) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: parseInt(h.slice(6, 8), 16) / 255,
      }
    }
    return null
  }

  m = s.match(/^rgba?\(([^)]+)\)$/)
  if (m) {
    const p = m[1].split(/[,/]/).map((x) => parseFloat(x.trim()))
    if (p.length >= 3 && p.slice(0, 3).every((n) => !Number.isNaN(n))) {
      const a = p.length >= 4 && !Number.isNaN(p[3]) ? p[3] : 1
      return { r: clamp(p[0], 0, 255), g: clamp(p[1], 0, 255), b: clamp(p[2], 0, 255), a: clamp(a, 0, 1) }
    }
    return null
  }

  m = s.match(/^hsla?\(([^)]+)\)$/)
  if (m) {
    const p = m[1].split(/[,/]/).map((x) => parseFloat(x.trim()))
    if (p.length >= 3 && p.slice(0, 3).every((n) => !Number.isNaN(n))) {
      const a = p.length >= 4 && !Number.isNaN(p[3]) ? p[3] : 1
      const hh = p[0]
      const sl = clamp(p[1], 0, 100) / 100
      const l = clamp(p[2], 0, 100) / 100
      const c = (1 - Math.abs(2 * l - 1)) * sl
      const x = c * (1 - Math.abs(((hh / 60) % 2) - 1))
      const mm = l - c / 2
      let r = 0
      let g = 0
      let b = 0
      if (hh < 60) [r, g] = [c, x]
      else if (hh < 120) [r, g] = [x, c]
      else if (hh < 180) [g, b] = [c, x]
      else if (hh < 240) [g, b] = [x, c]
      else if (hh < 300) [r, b] = [x, c]
      else [r, b] = [c, x]
      return { r: Math.round((r + mm) * 255), g: Math.round((g + mm) * 255), b: Math.round((b + mm) * 255), a: clamp(a, 0, 1) }
    }
  }
  return null
}

const hsvaToRgba = (c: HSVA): RGBA => ({ ...hsvToRgb(c.h, c.s, c.v), a: c.a })
const rgbaToHsva = (c: RGBA): HSVA => ({ ...rgbToHsv(c.r, c.g, c.b), a: c.a })
const toHsva = (value: string): HSVA => {
  const c = parseColor(value)
  return c ? rgbaToHsva(c) : { h: 0, s: 0, v: 0, a: 1 }
}
const normalize = (s: string): string => {
  const c = parseColor(s)
  return c ? rgbaToString(c).toLowerCase() : (s || '').trim().toLowerCase()
}

// 8px checkerboard for alpha track / transparent swatches.
const CHECKER =
  'repeating-conic-gradient(rgba(0,0,0,.12) 0% 25%, transparent 0% 50%) 50% / 8px 8px'

// ─── Panel ──────────────────────────────────────────────────────────

export interface ColorPickerPanelProps {
  /** Current colour as a CSS string (hex / rgba / transparent). */
  value: string
  onChange: (value: string) => void
  /** Quick-pick preset swatches shown below the picker. */
  presets?: string[]
  className?: string
}

export function ColorPickerPanel({ value, onChange, presets, className }: ColorPickerPanelProps) {
  // HSVA is the internal source of truth (hex round-trips lose hue at s/v=0).
  const [hsva, setHsva] = React.useState<HSVA>(() => toHsva(value))

  // Re-sync from an external value, but ignore the echo of our own onChange
  // (compare normalised strings) so dragging never snaps the thumb back.
  React.useEffect(() => {
    const incoming = parseColor(value)
    if (!incoming) return
    if (normalize(value) !== normalize(rgbaToString(hsvaToRgba(hsva)))) {
      setHsva(rgbaToHsva(incoming))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const emit = React.useCallback(
    (next: HSVA) => {
      setHsva(next)
      onChange(rgbaToString(hsvaToRgba(next)))
    },
    [onChange],
  )

  const rgba = hsvaToRgba(hsva)
  const hueColor = `hsl(${hsva.h}, 100%, 50%)`
  const solid = `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`
  const hexText = `#${hex2(rgba.r)}${hex2(rgba.g)}${hex2(rgba.b)}`.toUpperCase()

  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window

  const pickEyeDropper = async () => {
    try {
      const ED = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper
      const { sRGBHex } = await new ED().open()
      const c = parseColor(sRGBHex)
      if (c) emit(rgbaToHsva({ ...c, a: hsva.a }))
    } catch {
      // user cancelled / unsupported — ignore
    }
  }

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <SaturationArea hsva={hsva} hueColor={hueColor} solid={solid} onPick={(s, v) => emit({ ...hsva, s, v })} />

      <div className="flex items-center gap-2">
        {hasEyeDropper && (
          <button
            type="button"
            onClick={pickEyeDropper}
            aria-label="屏幕取色"
            className="border-border text-muted-foreground hover:bg-muted flex size-7 shrink-0 items-center justify-center rounded-md border"
          >
            <PipetteIcon size={13} />
          </button>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <HueSlider hue={hsva.h} onChange={(h) => emit({ ...hsva, h })} hueColor={hueColor} />
          <AlphaSlider alpha={hsva.a} solid={solid} onChange={(a) => emit({ ...hsva, a })} />
        </div>
      </div>

      {/* Hex + alpha inputs */}
      <div className="flex items-center gap-1.5">
        <div className="border-border focus-within:border-primary flex h-7 min-w-0 flex-1 items-center rounded-md border px-2">
          <span className="text-muted-foreground/60 mr-1 text-[11px]">#</span>
          <HexField hex={hexText} onCommit={(c) => emit(rgbaToHsva({ ...c, a: hsva.a }))} />
        </div>
        <AlphaField alpha={hsva.a} onCommit={(a) => emit({ ...hsva, a })} />
      </div>

      {presets && presets.length > 0 && (
        <div>
          <div className="text-muted-foreground/70 mb-1 text-[10px] tracking-wide uppercase">内置色板</div>
          <div className="flex flex-wrap gap-1">
            {presets.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange(c)}
                aria-label={c}
                title={c}
                className="border-border size-4 cursor-pointer rounded-sm border shadow-[inset_0_0_0_1px_rgba(0,0,0,.05)]"
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Saturation / value area ────────────────────────────────────────

function SaturationArea({
  hsva,
  hueColor,
  solid,
  onPick,
}: {
  hsva: HSVA
  hueColor: string
  solid: string
  onPick: (s: number, v: number) => void
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const dragging = React.useRef(false)

  const handle = (clientX: number, clientY: number) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = clamp((clientX - r.left) / r.width, 0, 1)
    const y = clamp((clientY - r.top) / r.height, 0, 1)
    onPick(Math.round(x * 100), Math.round((1 - y) * 100))
  }

  return (
    <div
      ref={ref}
      role="slider"
      aria-label="饱和度 / 明度"
      aria-valuetext={`S ${hsva.s} V ${hsva.v}`}
      tabIndex={0}
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        handle(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => dragging.current && handle(e.clientX, e.clientY)}
      onPointerUp={(e) => {
        dragging.current = false
        e.currentTarget.releasePointerCapture(e.pointerId)
      }}
      className="relative h-36 w-full cursor-crosshair touch-none rounded-md outline-none"
      style={{
        background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${hueColor}`,
      }}
    >
      <span
        className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,.45)]"
        style={{ left: `${hsva.s}%`, top: `${100 - hsva.v}%`, background: solid }}
      />
    </div>
  )
}

// ─── Sliders ────────────────────────────────────────────────────────

const trackBase = 'relative flex h-4 w-full touch-none items-center select-none'
const thumbBase =
  'block size-4 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.3)] outline-none focus-visible:ring-2 focus-visible:ring-ring'

function HueSlider({ hue, onChange, hueColor }: { hue: number; onChange: (h: number) => void; hueColor: string }) {
  return (
    <Slider.Root
      className={trackBase}
      min={0}
      max={360}
      step={1}
      value={[hue]}
      onValueChange={([h]) => onChange(h)}
      aria-label="色相"
    >
      <Slider.Track
        className="relative h-3 w-full grow overflow-hidden rounded-full"
        style={{ background: 'linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}
      >
        <Slider.Range className="absolute h-full bg-transparent" />
      </Slider.Track>
      <Slider.Thumb className={thumbBase} style={{ background: hueColor }} />
    </Slider.Root>
  )
}

function AlphaSlider({ alpha, solid, onChange }: { alpha: number; solid: string; onChange: (a: number) => void }) {
  return (
    <Slider.Root
      className={trackBase}
      min={0}
      max={100}
      step={1}
      value={[Math.round(alpha * 100)]}
      onValueChange={([a]) => onChange(a / 100)}
      aria-label="透明度"
    >
      <Slider.Track
        className="relative h-3 w-full grow overflow-hidden rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${solid}), ${CHECKER}` }}
      >
        <Slider.Range className="absolute h-full bg-transparent" />
      </Slider.Track>
      <Slider.Thumb className={thumbBase} style={{ background: solid }} />
    </Slider.Root>
  )
}

// ─── Numeric inputs ─────────────────────────────────────────────────

function HexField({ hex, onCommit }: { hex: string; onCommit: (c: RGBA) => void }) {
  const [text, setText] = React.useState(hex.replace('#', ''))
  React.useEffect(() => setText(hex.replace('#', '')), [hex])
  const commit = () => {
    const c = parseColor('#' + text)
    if (c) onCommit(c)
    else setText(hex.replace('#', ''))
  }
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      spellCheck={false}
      maxLength={8}
      className="text-foreground min-w-0 flex-1 border-none bg-transparent text-[11px] uppercase outline-none"
    />
  )
}

function AlphaField({ alpha, onCommit }: { alpha: number; onCommit: (a: number) => void }) {
  const pct = Math.round(alpha * 100)
  const [text, setText] = React.useState(String(pct))
  React.useEffect(() => setText(String(pct)), [pct])
  const commit = () => {
    const n = parseInt(text, 10)
    if (!Number.isNaN(n)) onCommit(clamp(n, 0, 100) / 100)
    else setText(String(pct))
  }
  return (
    <div className="border-border focus-within:border-primary flex h-7 w-14 items-center rounded-md border px-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        inputMode="numeric"
        className="text-foreground w-full min-w-0 border-none bg-transparent text-right text-[11px] outline-none"
      />
      <span className="text-muted-foreground/60 ml-0.5 text-[11px]">%</span>
    </div>
  )
}
