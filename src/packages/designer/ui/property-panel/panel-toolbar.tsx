import * as React from 'react'
import { RotateCcw, Search, Sparkles, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'

/**
 * Toolbar that sits between the WidgetHeader and the tab list.
 *
 *   ┌ 🔍 search... ───────────── [↩] [✨] ┐
 *
 * Three responsibilities:
 *   - Search-by-keyword filtering — emits `onSearch` upstream so the
 *     tabs can collapse-fold non-matches and highlight hits.
 *   - Reset-all — bulk-resets every prop on the widget back to the
 *     meta's defaultProps. Wrapped behind a confirm via dblclick.
 *   - AI Beautify — placeholder for the AI-assisted styling action,
 *     wired to `onAiBeautify` and disabled when no callback is given.
 */
export function PanelToolbar({
  search,
  onSearch,
  onResetAll,
  onAiBeautify,
}: {
  search: string
  onSearch: (next: string) => void
  onResetAll?: () => void
  onAiBeautify?: () => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className="border-border flex items-center gap-1 border-b px-2 py-1.5">
      <div
        className={cn(
          'bg-muted hover:bg-muted/80 focus-within:bg-card focus-within:border-primary',
          'flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-sm border border-transparent px-2 text-[11px] transition-colors',
        )}
      >
        <Search size={12} className="text-muted-foreground/70 shrink-0" />
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onSearch('')
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          placeholder="搜索属性…"
          className="text-foreground placeholder:text-muted-foreground/60 w-full border-none bg-transparent text-[11px] outline-none"
        />
        {search.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onSearch('')
              inputRef.current?.focus()
            }}
            className="text-muted-foreground/60 hover:text-foreground shrink-0 cursor-pointer"
            aria-label="清空搜索"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!onResetAll}
            onClick={() => onResetAll?.()}
            aria-label="重置所有属性为默认"
          >
            <RotateCcw size={13} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>重置所有属性</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!onAiBeautify}
            onClick={() => onAiBeautify?.()}
            aria-label="AI 美化"
            className="text-primary"
          >
            <Sparkles size={13} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>AI 美化</TooltipContent>
      </Tooltip>
    </div>
  )
}
