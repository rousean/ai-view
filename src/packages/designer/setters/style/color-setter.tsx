import * as React from 'react'
import { Button } from '~/components/ui/button'
import { ColorArea, ColorPicker, ColorSlider, ColorThumb, SliderTrack } from '~/components/ui/color'
import { Input } from '~/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import type { SetterProps } from '../setter.interface'

interface ColorSetterProps {
  /** Preset swatches shown below the picker. */
  presets?: string[]
}

const DEFAULT_PRESETS = [
  '#5b8def',
  '#22d3ee',
  '#34d399',
  '#fbbf24',
  '#f97316',
  '#f472b6',
  '#a78bfa',
  '#0b1220',
  '#e6edf6',
  '#ffffff',
]

/**
 * Colour setter:
 *  - Trigger is a small swatch button + a hex Input side-by-side.
 *  - Click the swatch → Popover with the react-aria ColorPicker
 *    (saturation/value area + hue slider + preset swatches).
 *  - The Input accepts hex like #rgb / #rrggbb / #rrggbbaa.
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
  const [text, setText] = React.useState(v)

  React.useEffect(() => setText(v), [v])

  const commitText = (raw: string) => {
    const s = raw.trim()
    if (/^#[0-9a-fA-F]{3,8}$/.test(s)) onChange(s)
    else if (s === '') onChange('')
    else setText(v) // reject invalid, revert display
  }

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={disabled}
            className="shrink-0 p-0"
            aria-label="选择颜色"
          >
            <span className="block size-5 rounded border border-border" style={{ background: v }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
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
                <div className="flex flex-wrap gap-1">
                  {presets.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onChange(c)}
                      className="size-5 rounded border border-border ring-1 ring-inset ring-black/5 transition hover:scale-110"
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              )}
            </div>
          </ColorPicker>
        </PopoverContent>
      </Popover>
      <Input
        type="text"
        className="h-8 flex-1 font-mono text-xs uppercase"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commitText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitText((e.target as HTMLInputElement).value)
        }}
      />
    </div>
  )
}
