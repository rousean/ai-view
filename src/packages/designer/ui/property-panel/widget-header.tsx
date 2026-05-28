import * as React from 'react'
import { ChartBar, Copy, Database, FlaskConical, MoreHorizontal, Trash2 } from 'lucide-react'
import type { WidgetNode } from '@schema/types'
import type { WidgetMeta } from '@widgets/widget-meta'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import { useDashboardEditor } from '../../editor/editor-context'

/**
 * Header strip at the top of the 设计 / 数据 / 交互 / 动画 tabs.
 *
 *   ┌─ Icon ─ Name + #id ─────────── Badge ─ ⎘ 🗑 ⋯ ─┐
 *
 * The data badge surfaces the resolver state without making the user
 * crack open the 数据 tab to find out: `示例` (untouched), `内联`,
 * `已绑定`, or `数据源缺失`. Click jumps to the data tab — but that's
 * wired by the parent (we just emit `onJumpToData`).
 */
export function WidgetHeader({
  widget,
  meta,
  onJumpToData,
}: {
  widget: WidgetNode
  meta: WidgetMeta | undefined
  onJumpToData: () => void
}) {
  const editor = useDashboardEditor()
  const Icon = meta?.icon ?? ChartBar

  const dataStatus = inferDataStatus(widget)

  return (
    <div className="border-border flex items-center gap-2 border-b px-3 pt-3 pb-3">
      <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-medium">{widget.name}</span>
          <DataBadge status={dataStatus} onClick={onJumpToData} />
        </div>
        <div className="text-muted-foreground/80 truncate font-mono text-[11px]">
          {meta?.title ?? widget.type} · #{widget.id.slice(0, 8)}
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="复制组件"
            onClick={() =>
              editor.execute('widget.add', { type: widget.type, props: widget.props })
            }
          >
            <Copy size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>复制组件</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            aria-label="删除组件"
            onClick={() => editor.removeWidgets([widget.id])}
          >
            <Trash2 size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>删除组件</TooltipContent>
      </Tooltip>
      <Button variant="ghost" size="icon-sm" aria-label="更多">
        <MoreHorizontal size={14} />
      </Button>
    </div>
  )
}

type DataStatus = 'sample' | 'inline' | 'bound' | 'broken' | 'none'

function inferDataStatus(widget: WidgetNode): DataStatus {
  const data = widget.data
  if (!data) return 'sample'
  if (data.mode === 'inline') return 'inline'
  if (data.mode === 'bound') {
    return data.sourceId ? 'bound' : 'broken'
  }
  return 'none'
}

function DataBadge({
  status,
  onClick,
}: {
  status: DataStatus
  onClick: () => void
}) {
  const presets: Record<
    DataStatus,
    { label: string; variant: 'outline' | 'secondary' | 'destructive'; Icon: React.ComponentType<{ size?: number; className?: string }> }
  > = {
    sample: { label: '示例', variant: 'outline', Icon: FlaskConical },
    inline: { label: '内联', variant: 'secondary', Icon: Database },
    bound: { label: '已绑定', variant: 'secondary', Icon: Database },
    broken: { label: '数据源缺失', variant: 'destructive', Icon: Database },
    none: { label: '无数据', variant: 'outline', Icon: Database },
  }
  const { label, variant, Icon } = presets[status]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn('cursor-pointer', 'shrink-0')}
        >
          <Badge variant={variant} className="h-4 gap-0.5 px-1.5 text-[10px]">
            <Icon size={10} />
            {label}
          </Badge>
        </button>
      </TooltipTrigger>
      <TooltipContent>点击查看数据配置</TooltipContent>
    </Tooltip>
  )
}
