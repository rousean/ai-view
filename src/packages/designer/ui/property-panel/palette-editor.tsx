import * as React from 'react'
import { ChevronDown, Layers, PaintBucket, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import { useDashboardEditor } from '../../editor/editor-context'
import {
  BUILTIN_PALETTE_TEMPLATES,
  inferPalettePatch,
  replacePalette,
  setPalette,
  TOKEN_KEYS,
  TOKEN_LABELS,
  usePalette,
  type PaletteTemplate,
  type ProjectPalette,
} from '../../palette'
import { ColorSetter } from '../../setters'

/**
 * Palette editor — replaces the Sprint-2 ThemePicker. Lives in the
 * panel header, always visible.
 *
 *   ┌ [chip][chip][chip]…  6 token chips ─── 配色方案 ▾ ┐
 *
 * Clicking a token chip opens a colour picker for that token; the
 * "配色方案" dropdown applies a built-in template (replacing the whole
 * palette) and optionally pushes the new tokens onto every existing
 * widget (the user explicitly opts in via a checkbox in the dialog).
 *
 * The series-colour ramp is editable via an expanded popover so we
 * don't blow the header height for the (less common) multi-series case.
 */
export function PaletteEditor() {
  const palette = usePalette()
  const [templateDialogOpen, setTemplateDialogOpen] = React.useState(false)

  return (
    <div className="border-border bg-card/30 flex items-center gap-2 border-b px-3 py-2">
      <PaintBucket size={12} className="text-muted-foreground/80 shrink-0" />
      <span className="text-muted-foreground/80 shrink-0 text-[11px]">色板</span>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {TOKEN_KEYS.map((k) => (
          <TokenChipPopover key={k} tokenKey={k} color={palette[k]} />
        ))}
        <SeriesChipPopover series={palette.series} />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label="配色方案">
            <ChevronDown size={12} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {BUILTIN_PALETTE_TEMPLATES.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onSelect={() => {
                setTemplateDialogOpen(false)
                // Open confirmation dialog so the user picks whether to also
                // recolour existing widgets — that's destructive enough that
                // we don't do it implicitly.
                openTemplate(t)
              }}
              className="gap-2"
            >
              <SwatchStrip swatch={t.swatch} />
              <span>{t.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onSelect={() => setTemplateDialogOpen(true)}
            className="border-border/60 text-muted-foreground mt-1 border-t pt-2 text-[11px]"
          >
            <RefreshCw />
            自定义 / 重置色板
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TemplateConfirmDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
      />
    </div>
  )
}

// Module-scoped channel so DropdownMenuItem can request the dialog. Kept
// local — it never leaves this file.
let pendingTemplate: PaletteTemplate | null = null
const subscribers = new Set<() => void>()
function openTemplate(t: PaletteTemplate) {
  pendingTemplate = t
  subscribers.forEach((fn) => fn())
}

function usePendingTemplate(): PaletteTemplate | null {
  const [, force] = React.useReducer((n: number) => n + 1, 0)
  React.useEffect(() => {
    const cb = () => force()
    subscribers.add(cb)
    return () => {
      subscribers.delete(cb)
    }
  }, [])
  return pendingTemplate
}

// ─── Token chip — small colour swatch + inline ColorSetter on click ───

function TokenChipPopover({
  tokenKey,
  color,
}: {
  tokenKey: keyof typeof TOKEN_LABELS
  color: string
}) {
  const editor = useDashboardEditor()
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`${TOKEN_LABELS[tokenKey]} · ${color}`}
              className={cn(
                'border-border ring-offset-card h-4 w-4 cursor-pointer rounded-sm border shadow-[inset_0_0_0_1px_rgba(0,0,0,.06)]',
                'hover:ring-primary/40 hover:ring-2 hover:ring-offset-1',
              )}
              style={{ background: color }}
            />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{TOKEN_LABELS[tokenKey]} · {color.toUpperCase()}</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" sideOffset={4} className="w-56 p-3">
        <div className="text-muted-foreground/80 mb-2 text-[11px]">
          {TOKEN_LABELS[tokenKey]}
        </div>
        <ColorSetter
          value={color}
          onChange={(v) => setPalette(editor, { [tokenKey]: v as string })}
          context={{ node: null as never, editor }}
          setterProps={undefined}
        />
      </PopoverContent>
    </Popover>
  )
}

// ─── Series chip — opens an editable list of multi-series colours ─────

function SeriesChipPopover({ series }: { series: string[] }) {
  const editor = useDashboardEditor()
  const updateSeries = (next: string[]) => setPalette(editor, { series: next })
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="系列色"
              className={cn(
                'border-border ring-offset-card flex h-4 w-7 cursor-pointer overflow-hidden rounded-sm border shadow-[inset_0_0_0_1px_rgba(0,0,0,.06)]',
                'hover:ring-primary/40 hover:ring-2 hover:ring-offset-1',
              )}
            >
              {series.slice(0, 6).map((c, i) => (
                <span key={`${c}-${i}`} className="block flex-1" style={{ background: c }} />
              ))}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>系列色 · {series.length} 个</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" sideOffset={4} className="w-60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-foreground/85 text-[12px] font-medium">系列色</span>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={series.length >= 12}
            onClick={() => updateSeries([...series, '#888888'])}
            aria-label="新增系列色"
          >
            <Plus size={12} />
          </Button>
        </div>
        <ul className="space-y-1.5">
          {series.map((c, i) => (
            <li key={`${i}`} className="group/series flex items-center gap-1.5">
              <Layers size={11} className="text-muted-foreground/70 shrink-0" />
              <span className="text-muted-foreground/70 w-12 shrink-0 text-[10px]">
                系列 {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <ColorSetter
                  value={c}
                  onChange={(next) => {
                    const out = series.slice()
                    out[i] = next as string
                    updateSeries(out)
                  }}
                  context={{ node: null as never, editor }}
                  setterProps={undefined}
                />
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={series.length <= 1}
                onClick={() => updateSeries(series.filter((_, idx) => idx !== i))}
                aria-label={`删除系列 ${i + 1}`}
                className="text-muted-foreground/60 hover:text-destructive opacity-0 group-hover/series:opacity-100"
              >
                <Trash2 size={10} />
              </Button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

// ─── Confirmation dialog — "apply to existing widgets too?" ───────────

function TemplateConfirmDialog({
  open: explicitOpen,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const editor = useDashboardEditor()
  const pending = usePendingTemplate()
  const open = explicitOpen || pending !== null
  const [paintExisting, setPaintExisting] = React.useState(true)

  const close = () => {
    pendingTemplate = null
    onOpenChange(false)
    subscribers.forEach((fn) => fn())
  }

  const apply = () => {
    if (!pending) return close()
    replacePalette(editor, pending.palette)
    if (paintExisting) {
      const page = editor.getCurrentPage()
      if (page) {
        for (const w of page.widgets) {
          const patch = inferPalettePatch(w.props, pending.palette)
          if (Object.keys(patch).length > 0) {
            editor.updateProps(w.id, { ...w.props, ...patch })
          }
        }
      }
    }
    close()
  }

  const targetName = pending?.name ?? '自定义'
  const targetPalette: ProjectPalette | undefined = pending?.palette

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>应用配色方案 · {targetName}</DialogTitle>
          <DialogDescription>
            将整个项目的色板替换为此方案。可选是否同时把现有组件颜色也刷成新配色。
          </DialogDescription>
        </DialogHeader>
        {targetPalette && (
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-6 gap-1">
              {TOKEN_KEYS.map((k) => (
                <div key={k} className="flex flex-col items-center gap-1">
                  <span
                    className="ring-border h-6 w-full rounded-sm ring-1"
                    style={{ background: targetPalette[k] }}
                  />
                  <span className="text-muted-foreground/70 text-[10px]">
                    {TOKEN_LABELS[k]}
                  </span>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={paintExisting}
                onChange={(e) => setPaintExisting(e.target.checked)}
                className="accent-primary"
              />
              同时把现有组件的颜色刷成新配色
            </label>
            <div className="text-muted-foreground/60 text-[10px]">
              提示：仅替换匹配到色板含义的字段，用户手动指定的特殊颜色不受影响。
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={close}>
            取消
          </Button>
          <Button size="sm" onClick={apply}>
            应用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SwatchStrip({ swatch }: { swatch: readonly [string, string, string] | string[] }) {
  return (
    <span className="ring-border/40 flex h-3 w-9 shrink-0 overflow-hidden rounded-[2px] ring-1">
      {swatch.slice(0, 3).map((c, i) => (
        <span key={`${c}-${i}`} className="block flex-1" style={{ background: c }} />
      ))}
    </span>
  )
}
