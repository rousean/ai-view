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
 * Colour setter — styled as a single `.prop-input` row to match the rest
 * of the property panel.
 *
 *   ┌────────────────────────────────┐
 *   │ [swatch] ABCDEF       100%     │   ← whole row is .prop-input
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

  const commit = (raw: string) => {
    const s = raw.trim().replace(/^#/, '')
    if (/^[0-9a-fA-F]{3,8}$/.test(s)) onChange('#' + s.toUpperCase())
    else if (s === '') onChange('')
    else setText(hexLabel(v)) // invalid → revert
  }

  return (
    <div
      className="prop-input"
      style={{ gap: 6, opacity: disabled ? 0.5 : undefined }}
      data-disabled={disabled || undefined}
    >
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="swatch"
            style={{ background: v, cursor: disabled ? 'not-allowed' : 'pointer' }}
            aria-label="打开取色器"
          />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-64"
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-popover)',
          }}
        >
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {presets.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onChange(c)}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: c,
                        border: '1px solid var(--border)',
                        boxShadow: '0 0 0 1px rgba(0,0,0,.05) inset',
                        cursor: 'pointer',
                      }}
                      aria-label={c}
                    />
                  ))}
                </div>
              )}
            </div>
          </ColorPicker>
        </PopoverContent>
      </Popover>
      <input
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit((e.target as HTMLInputElement).value)
        }}
        style={{ flex: 1, textTransform: 'uppercase' }}
        spellCheck={false}
      />
      <span className="t-4 t-xs">100%</span>
    </div>
  )
}

function hexLabel(c: string) {
  return c.replace('#', '').toUpperCase()
}
