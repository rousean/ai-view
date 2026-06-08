import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import type { Background } from '@schema/types'
import type { ProjectPalette } from '@designer/palette'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { cn } from '~/lib/utils'
import { createProjectFromTemplate } from '../use-projects'
import {
  DASHBOARD_TEMPLATES,
  getTemplateBackground,
  getTemplatePalette,
  type DashboardTemplate,
} from '../templates/dashboard-templates'

/**
 * 模板市场 dialog — pick a built-in starter, get a fully themed project.
 *
 * Thumbnails are drawn live from the template's own layout rects (scaled
 * into the card via `%` positioning), so they always match what you get —
 * no screenshot assets to keep in sync.
 */
export function TemplateGallery({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const navigate = useNavigate()
  const [busy, setBusy] = React.useState<string | null>(null)

  const pick = async (t: DashboardTemplate) => {
    if (busy) return
    setBusy(t.id)
    try {
      const project = await createProjectFromTemplate(t)
      onOpenChange(false)
      await navigate({ to: '/editor-v2', search: { id: project.id } })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>从模板新建</DialogTitle>
          <DialogDescription>
            选择一个模板快速开始，所有图表、配色与布局都可在编辑器中自由修改。
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DASHBOARD_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => void pick(t)}
              disabled={!!busy}
              className={cn(
                'group border-border bg-card hover:border-primary focus-visible:border-primary relative flex flex-col overflow-hidden rounded-lg border text-left transition-colors outline-none disabled:opacity-60',
              )}
            >
              <div className="bg-muted relative aspect-video w-full overflow-hidden">
                <TemplateThumb template={t} />
                {busy === t.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="size-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                  {t.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Thumbnail ──────────────────────────────────────────────────────

function TemplateThumb({ template }: { template: DashboardTemplate }) {
  const palette = getTemplatePalette(template)
  const bg = backgroundToCss(getTemplateBackground(template))
  return (
    <div className="absolute inset-0" style={{ background: bg }}>
      {template.widgets.map((w, i) => (
        <div
          key={i}
          className="absolute rounded-[2px]"
          style={{
            left: `${(w.x / 1920) * 100}%`,
            top: `${(w.y / 1080) * 100}%`,
            width: `${(w.w / 1920) * 100}%`,
            height: `${(w.h / 1080) * 100}%`,
            background: thumbColor(w.type, palette),
          }}
        />
      ))}
    </div>
  )
}

function backgroundToCss(bg: Background | undefined): string {
  if (!bg) return '#0B1020'
  switch (bg.type) {
    case 'color':
      return bg.color
    case 'transparent':
      return 'transparent'
    case 'gradient': {
      const g = bg.gradient
      const stops = g.stops
        .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
        .join(', ')
      return g.type === 'radial'
        ? `radial-gradient(circle, ${stops})`
        : `linear-gradient(${g.angle ?? 90}deg, ${stops})`
    }
    case 'image':
      return '#0B1020'
    default:
      return '#0B1020'
  }
}

/** Translucent fill representing each widget type in the mini preview. */
function thumbColor(type: string, palette: ProjectPalette): string {
  switch (type) {
    case 'text':
      return hexA(palette.text, 0.16)
    case 'number-card':
      return hexA(palette.primary, 0.22)
    case 'bar-chart':
    case 'line-chart':
    case 'area-chart':
    case 'gauge-chart':
      return hexA(palette.series[0] ?? palette.primary, 0.3)
    case 'donut-chart':
    case 'pie-chart':
      return hexA(palette.secondary, 0.3)
    case 'clock':
      return hexA(palette.secondary, 0.35)
    case 'divider':
      return hexA(palette.grid, 0.6)
    case 'table':
    default:
      return hexA(palette.muted, 0.2)
  }
}

/** Append an alpha channel to a `#rrggbb` hex; pass others through. */
function hexA(hex: string, alpha: number): string {
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    const a = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, '0')
    return hex + a
  }
  return hex
}
