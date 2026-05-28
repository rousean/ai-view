import * as React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import { TOKEN_LABELS, TOKEN_KEYS, type ProjectPalette } from './palette-types'
import { usePalette } from './palette-store'

/**
 * Project-palette chip strip — reused inside ColorSetter and FontSetter
 * popovers. Two rows:
 *   1. Semantic tokens (primary / secondary / text / muted / axis / grid)
 *   2. Categorical series ramp (multi-series colours, shown smaller)
 *
 * Clicking a chip emits the literal hex via `onPick` — no live binding
 * to the token. Selecting the same colour the user already has gets a
 * focus ring so they can see the match.
 */
export function PalettePicker({
  currentColor,
  onPick,
}: {
  currentColor?: string
  onPick: (hex: string) => void
}) {
  const palette = usePalette()
  return (
    <div className="space-y-2">
      <div>
        <div className="text-muted-foreground/70 mb-1 text-[10px] tracking-wide uppercase">
          项目色板
        </div>
        <div className="flex gap-1">
          {TOKEN_KEYS.map((k) => (
            <PaletteChip
              key={k}
              color={palette[k]}
              label={TOKEN_LABELS[k]}
              active={normalize(currentColor) === normalize(palette[k])}
              onClick={() => onPick(palette[k])}
            />
          ))}
        </div>
      </div>
      {palette.series.length > 0 && (
        <div>
          <div className="text-muted-foreground/70 mb-1 text-[10px] tracking-wide uppercase">
            系列色
          </div>
          <div className="flex flex-wrap gap-1">
            {palette.series.map((c, i) => (
              <PaletteChip
                key={`${c}-${i}`}
                color={c}
                label={`系列 ${i + 1}`}
                active={normalize(currentColor) === normalize(c)}
                onClick={() => onPick(c)}
                small
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PaletteChip({
  color,
  label,
  active,
  onClick,
  small,
}: {
  color: string
  label: string
  active?: boolean
  onClick: () => void
  small?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${label} · ${color}`}
          onClick={onClick}
          className={cn(
            'border-border ring-offset-card cursor-pointer rounded-sm border shadow-[inset_0_0_0_1px_rgba(0,0,0,.05)]',
            small ? 'h-4 w-4' : 'h-5 w-5',
            active && 'ring-primary ring-2 ring-offset-1',
          )}
          style={{ background: color }}
        />
      </TooltipTrigger>
      <TooltipContent>
        {label} · {color.toUpperCase()}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Tiny exported helper — the same colour can show up as `#abc`, `#aabbcc`
 * or `#ABC` depending on input source. Comparing for "active" needs a
 * normalised form.
 */
export function normalizeHex(c: string | undefined): string {
  if (!c) return ''
  const s = c.trim().replace(/^#/, '').toUpperCase()
  if (s.length === 3) return s.split('').map((ch) => ch + ch).join('')
  return s
}

const normalize = normalizeHex

/** Re-export the palette type so chip consumers don't import both files. */
export type { ProjectPalette }
