import * as React from 'react'
import {
  ColorArea,
  ColorPicker,
  ColorSlider,
  ColorThumb,
  SliderTrack,
} from '~/components/ui/color'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import { Separator } from '~/components/ui/separator'
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
 *   │ [swatch] ABCDEF       100%     │   ← whole row uses PropInput chrome
 *   └────────────────────────────────┘
 *      ▲ clicking the swatch opens a Popover with the full picker
 *
 * Hex text is normalised on commit; invalid values revert.
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

  const [text, setText] = React.useState(hexLabel(v))
  React.useEffect(() => setText(hexLabel(v)), [v])

  // "Bound to a palette token" indicator. When the value matches a
  // token, swap the hex input for a compact chip ("= 主色") so the
  // author sees the alias rather than the literal hex. Clicking it
  // reveals the hex for one-off edits.
  //
  // `showHexOverride` is a one-shot state: clicking the chip flips it
  // on, the input becomes editable, and the next prop value change
  // (color picker or palette click) snaps back to chip mode. Without
  // this React-side flag the previous classList-based reveal was
  // wiped on the next render — making the chip click feel broken.
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
    const s = raw.trim().replace(/^#/, '')
    if (/^[0-9a-fA-F]{3,8}$/.test(s)) onChange('#' + s.toUpperCase())
    else if (s === '') onChange('')
    else setText(hexLabel(v)) // invalid → revert
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
            <ColorPicker
              value={v}
              onChange={(c) => onChange(typeof c === 'string' ? c : c.toString('hex'))}
            >
              <div className="space-y-3">
                <ColorArea
                  colorSpace="hsb"
                  xChannel="saturation"
                  yChannel="brightness"
                  className="size-full"
                >
                  <ColorThumb />
                </ColorArea>
                <ColorSlider colorSpace="hsb" channel="hue">
                  <SliderTrack className="w-full">
                    <ColorThumb />
                  </SliderTrack>
                </ColorSlider>
                {presets.length > 0 && (
                  <div>
                    <div className="text-muted-foreground/70 mb-1 text-[10px] tracking-wide uppercase">
                      内置色板
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {presets.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => onChange(c)}
                          aria-label={c}
                          className="border-border h-4 w-4 cursor-pointer rounded-sm border shadow-[inset_0_0_0_1px_rgba(0,0,0,.05)]"
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ColorPicker>
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
      <span className="text-muted-foreground/60 text-[11px]">100%</span>
    </PropInput>
  )
}

function hexLabel(c: string) {
  return c.replace('#', '').toUpperCase()
}
