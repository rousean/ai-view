import * as React from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import type { WidgetNode } from '@schema/types'
import type { WidgetMeta } from '@widgets/widget-meta'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import { useDashboardEditor } from '../../editor/editor-context'
import { mockBeautifyService } from '../../ai'
import type { BeautifySuggestion } from '../../ai'

/**
 * AI Beautify modal — opens from the panel toolbar's Sparkles button.
 *
 * Layout:
 *   ┌ ✨ AI 美化建议 ─────────────────────────────────── ✕ ┐
 *   │ 为 [图表名] 生成的样式建议，挑一个一键套用。            │
 *   │                                                          │
 *   │   [card1]    [card2]    [card3]                          │
 *   │   swatches   swatches   swatches                         │
 *   │   title      title      title                            │
 *   │   summary    summary    summary                          │
 *   │   [应用]     [应用]     [应用]                            │
 *   └ 关闭 ────────────────────────────────────────────────────┘
 *
 * The service call is cancelled when the dialog closes mid-request.
 * `applied` highlights the selected card briefly so the user sees what
 * just changed before the dialog dismisses itself.
 */
export function AiBeautifyDialog({
  open,
  onOpenChange,
  widget,
  meta,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  widget: WidgetNode | null
  meta: WidgetMeta | undefined
}) {
  const editor = useDashboardEditor()
  const [suggestions, setSuggestions] = React.useState<BeautifySuggestion[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [appliedId, setAppliedId] = React.useState<string | null>(null)

  // Kick off a request whenever the dialog opens against a fresh widget.
  // Aborted via AbortController on close.
  React.useEffect(() => {
    if (!open || !widget) return
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    setSuggestions([])
    setAppliedId(null)
    mockBeautifyService
      .suggest({ widget, meta }, ctrl.signal)
      .then((items) => {
        if (ctrl.signal.aborted) return
        setSuggestions(items)
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return
        setError((err as Error)?.message ?? '生成失败')
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })
    return () => ctrl.abort()
  }, [open, widget, meta])

  const handleApply = (s: BeautifySuggestion) => {
    if (!widget) return
    editor.updateProps(widget.id, { ...widget.props, ...s.propsPatch })
    setAppliedId(s.id)
    // Brief delay so the user perceives the highlight before dismiss.
    window.setTimeout(() => onOpenChange(false), 350)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            AI 美化建议
          </DialogTitle>
          <DialogDescription>
            {widget
              ? `为 ${widget.name} 生成 ${suggestions.length || 3} 套样式建议，挑一个一键套用。`
              : '请先选中一个组件。'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-2">
          {loading && Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          {!loading && error && (
            <div className="text-destructive col-span-3 py-8 text-center text-sm">
              {error}
            </div>
          )}
          {!loading &&
            !error &&
            suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                applied={appliedId === s.id}
                onApply={() => handleApply(s)}
              />
            ))}
        </div>

        <DialogFooter>
          <span className="text-muted-foreground/70 mr-auto text-[11px]">
            提示：仅样式相关属性会被覆盖，布局和数据不受影响。
          </span>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SuggestionCard({
  suggestion,
  applied,
  onApply,
}: {
  suggestion: BeautifySuggestion
  applied: boolean
  onApply: () => void
}) {
  return (
    <div
      className={cn(
        'border-border bg-card hover:border-primary/40 group relative flex flex-col gap-2 rounded-lg border p-3 transition-colors',
        applied && 'border-primary ring-primary/40 ring-2',
      )}
    >
      <div className="flex h-8 overflow-hidden rounded-md">
        {suggestion.swatch.map((c, i) => (
          <span key={`${c}-${i}`} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <div>
        <div className="text-foreground/90 text-[12px] font-medium">
          {suggestion.title}
        </div>
        <div className="text-muted-foreground/70 mt-0.5 text-[10px] leading-snug">
          {suggestion.summary}
        </div>
      </div>
      <Button
        size="xs"
        variant={applied ? 'default' : 'outline'}
        onClick={onApply}
        className="mt-auto"
      >
        {applied ? '已应用 ✓' : '应用此方案'}
      </Button>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="border-border/60 bg-muted/30 flex flex-col gap-2 rounded-lg border p-3">
      <div className="bg-muted h-8 animate-pulse rounded-md" />
      <div className="bg-muted h-3 w-2/3 animate-pulse rounded" />
      <div className="bg-muted h-2 w-full animate-pulse rounded" />
      <Button size="xs" variant="outline" disabled className="mt-auto">
        <Loader2 size={12} className="animate-spin" />
      </Button>
    </div>
  )
}
