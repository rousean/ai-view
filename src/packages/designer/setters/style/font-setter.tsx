import * as React from 'react'
import { Bold, Italic, Type as TypeIcon } from 'lucide-react'
import {
  ColorArea,
  ColorPicker,
  ColorSlider,
  ColorThumb,
  SliderTrack,
} from '~/components/ui/color'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Separator } from '~/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import { matchPaletteToken, usePalette } from '../../palette'
import { PalettePicker } from '../../palette/palette-picker'
import { NumInput, PropInput } from '../../ui/property-controls'
import type { SetterProps } from '../setter.interface'

/**
 * Compound text style — colour + size + (optional) weight + italic, on a
 * single row. Replaces 3-4 separate setters that previously produced
 * one row each ("标题字号"/"标题颜色"/"标题字重"…).
 *
 *   ┌ [⬤] [ 14 ] [B] [I] ┐
 *
 * The value is a small object so widgets can carry the full text style
 * as one prop instead of N. Backwards-compatible for prop schemas that
 * stored just a colour string — the setter accepts both shapes via
 * `setterProps.compat = "color"`.
 */
export interface FontStyle {
  color?: string
  size?: number
  weight?: number | 'normal' | 'bold'
  italic?: boolean
}

interface FontSetterProps {
  minSize?: number
  maxSize?: number
  /** Show italic toggle. Defaults to false. */
  italic?: boolean
  /** Show weight toggle (normal/bold). Defaults to true. */
  weight?: boolean
  /** Preset colour swatches in the picker. */
  presets?: string[]
}

const DEFAULT_PRESETS = [
  '#1E1E1E',
  '#FFFFFF',
  '#0D99FF',
  '#00D4FF',
  '#FF5EDD',
  '#FBBF24',
  '#14AE5C',
  '#9CA3AF',
]

export const FontSetter: React.FC<SetterProps<FontStyle>> = ({
  value,
  onChange,
  setterProps,
  disabled,
}) => {
  const opts = (setterProps ?? {}) as FontSetterProps
  const v: FontStyle = value && typeof value === 'object' ? value : {}
  const color = v.color || '#1E1E1E'
  const size = typeof v.size === 'number' ? v.size : 12
  const weight: 'normal' | 'bold' = v.weight === 'bold' || v.weight === 700 ? 'bold' : 'normal'
  const italic = !!v.italic
  const presets = opts.presets ?? DEFAULT_PRESETS
  const showWeight = opts.weight !== false
  const showItalic = opts.italic === true

  const patch = (next: Partial<FontStyle>) => onChange({ ...v, ...next })

  // Same palette-token surface as ColorSetter — small label that
  // tells the author whether the colour is bound to a known token.
  const palette = usePalette()
  const tokenMatch = React.useMemo(
    () => matchPaletteToken(palette, color),
    [palette, color],
  )
  const tokenLabel = tokenMatch
    ? tokenMatch.kind === 'token'
      ? tokenMatch.label
      : `系列 ${tokenMatch.index + 1}`
    : null

  return (
    <PropInput className="gap-1" disabled={disabled}>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                aria-label="文字颜色"
                className={cn(
                  'h-3.5 w-3.5 shrink-0 rounded-[3px] ring-1 ring-black/10',
                  disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                )}
                style={{ background: color }}
              />
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            文字颜色 {tokenLabel ? `· = ${tokenLabel}` : ''}
          </TooltipContent>
        </Tooltip>
        <PopoverContent align="start" sideOffset={4} className="w-64">
          <div className="space-y-3">
            <PalettePicker currentColor={color} onPick={(c) => patch({ color: c })} />
            <Separator />
            <ColorPicker
              value={color}
              onChange={(c) =>
                patch({ color: typeof c === 'string' ? c : c.toString('hex') })
              }
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
                          onClick={() => patch({ color: c })}
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
      {tokenLabel && (
        <span
          className="bg-primary/10 text-primary rounded-sm px-1 text-[10px] font-medium"
          title={`绑定到 ${tokenLabel} (${color.toUpperCase()})`}
        >
          {tokenLabel}
        </span>
      )}
      <NumInput
        value={size}
        min={opts.minSize ?? 8}
        max={opts.maxSize ?? 48}
        onChange={(n) => patch({ size: n })}
        width={40}
        disabled={disabled}
      />
      {(showWeight || showItalic) && (
        <ToggleGroup
          type="multiple"
          size="sm"
          spacing={0}
          className="ml-auto h-5"
          value={[weight === 'bold' ? 'b' : '', italic ? 'i' : ''].filter(Boolean)}
          onValueChange={(vals) => {
            const wantBold = vals.includes('b')
            const wantItalic = vals.includes('i')
            const next: Partial<FontStyle> = {}
            if (showWeight) next.weight = wantBold ? 'bold' : 'normal'
            if (showItalic) next.italic = wantItalic
            patch(next)
          }}
        >
          {showWeight && (
            <ToggleGroupItem value="b" size="sm" className="h-5 w-5" aria-label="加粗">
              <Bold size={10} />
            </ToggleGroupItem>
          )}
          {showItalic && (
            <ToggleGroupItem value="i" size="sm" className="h-5 w-5" aria-label="斜体">
              <Italic size={10} />
            </ToggleGroupItem>
          )}
        </ToggleGroup>
      )}
      <TypeIcon className="text-muted-foreground/30 ml-0.5 hidden" size={10} />
    </PropInput>
  )
}
