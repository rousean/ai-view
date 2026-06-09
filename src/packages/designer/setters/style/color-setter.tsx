import * as React from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import { Separator } from '~/components/ui/separator'
import { ColorPickerPanel, parseColor } from '~/components/ui/color-picker'
import { cn } from '~/lib/utils'
import { matchPaletteToken, usePalette } from '../../palette'
import { PalettePicker } from '../../palette/palette-picker'
import { PropInput } from '../../ui/property-controls'
import type { SetterProps } from '../setter.interface'

interface ColorSetterProps {
  /** Preset swatches shown below the picker. */
  presets?: string[]
}

const DEFAULT_PRESETS = [
  '#0d99ff',
  '#00d4ff',
  '#7c5cff',
  '#ff5edd',
  '#fbbf24',
  '#14ae5c',
  '#f24822',
  '#1e1e1e',
  '#8a8a8a',
  '#ffffff',
]

/**
 * Colour setter — styled as a single property row to match the rest of
 * the property panel.
 *
 *   ┌────────────────────────────────┐
 *   │ [swatch] ABCDEF        80%      │   ← whole row uses PropInput chrome
 *   └────────────────────────────────┘
 *      ▲ clicking the swatch opens a Popover with the Figma-style picker
 *        (saturation/value area + hue & alpha sliders + hex/alpha inputs)
 *
 * Hex text is normalised on commit; invalid values revert. The trailing
 * percentage reflects the colour's real alpha.
 */
export const ColorSetter: React.FC<SetterProps<string>> = ({
  value,
  onChange,
  setterProps,
  disabled,
}) => {
  const opts = (setterProps ?? {}) as ColorSetterProps
  const v = typeof value === 'string' && value.length > 0 ? value : '#ffffff'
  const presets = opts.presets ?? DEFAULT_PRESETS

  const [text, setText] = React.useState(colorLabel(v))
  React.useEffect(() => setText(colorLabel(v)), [v])

  // Trailing alpha percentage (truthful — was a hardcoded "100%" before).
  const alphaPct = React.useMemo(() => {
    const c = parseColor(v)
    return c ? Math.round(c.a * 100) : 100
  }, [v])

  // "Bound to a palette token" indicator. When the value matches a
  // token, swap the hex input for a compact chip ("= 主色") so the
  // author sees the alias rather than the literal hex. Clicking it
  // reveals the hex for one-off edits.
  //
  // `showHexOverride` is a one-shot state: clicking the chip flips it
  // on, the input becomes editable, and the next prop value change
  // (color picker or palette click) snaps back to chip mode.
  const palette = usePalette()
  const match = React.useMemo(() => matchPaletteToken(palette, v), [palette, v])
  const [showHexOverride, setShowHexOverride] = React.useState(false)
  React.useEffect(() => setShowHexOverride(false), [v])
  const tokenMatched = match
    ? match.kind === 'token'
      ? match.label
      : `系列 ${match.index + 1}`
    : null
  const tokenLabel = showHexOverride ? null : tokenMatched

  const commit = (raw: string) => {
    const t = raw.trim()
    if (t === '') {
      onChange('')
      return
    }
    if (t.toLowerCase() === 'transparent') {
      onChange('transparent')
      return
    }
    const s = t.replace(/^#/, '')
    if (/^[0-9a-fA-F]{3,8}$/.test(s)) {
      onChange('#' + s.toUpperCase())
      return
    }
    // Accept any CSS colour we can parse (rgb/rgba/hsl/hsla); otherwise
    // revert to the last good value.
    if (parseColor(t)) {
      onChange(t)
    } else {
      setText(colorLabel(v))
    }
  }

  return (
    <PropInput className="gap-1.5" disabled={disabled}>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="打开取色器"
            className={cn(
              'h-3.5 w-3.5 shrink-0 rounded-[3px] ring-1 ring-black/10',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
            style={{ background: v }}
          />
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={4} className="w-64">
          <div className="space-y-3">
            {/* Project palette — quick-pick semantic + series colours. */}
            <PalettePicker currentColor={v} onPick={(c) => onChange(c)} />
            <Separator />
            <ColorPickerPanel value={v} onChange={onChange} presets={presets} />
          </div>
        </PopoverContent>
      </Popover>
      {tokenLabel ? (
        <button
          type="button"
          className={cn(
            'bg-primary/10 text-primary mr-auto cursor-text rounded-sm px-1 py-px text-[10px] font-medium select-none',
          )}
          title={`${tokenLabel} · ${v.toUpperCase()}（点击切换为 hex 编辑）`}
          onClick={() => setShowHexOverride(true)}
        >
          = {tokenLabel}
        </button>
      ) : null}
      <input
        value={text}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={showHexOverride}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit((e.target as HTMLInputElement).value)
        }}
        spellCheck={false}
        className={cn(
          'text-foreground flex-1 border-none bg-transparent text-[11px] uppercase outline-none',
          tokenLabel && 'hidden',
        )}
      />
      <span className="text-muted-foreground/60 text-[11px]">{alphaPct}%</span>
    </PropInput>
  )
}

function isHexColor(c: string) {
  return /^#?[0-9a-fA-F]{3,8}$/.test(c.trim())
}

/**
 * Hex → uppercase digits (editable in the field); any other CSS colour
 * (`transparent`, `rgba(...)`, …) is shown verbatim instead of being
 * mangled into `TRANSPARENT` / `RGBA(...)` by a blind upper-case.
 */
function colorLabel(c: string) {
  return isHexColor(c) ? c.replace('#', '').toUpperCase() : c
}
