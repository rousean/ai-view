import * as React from 'react'
import { Database, History, Image, Layers, Plus, Settings } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'

export type RailKey = 'mat' | 'layers' | 'data' | 'assets' | 'history' | null

interface IconRailProps {
  active: RailKey
  onChange: (next: RailKey) => void
}

const ITEMS: {
  id: Exclude<RailKey, null>
  label: string
  Icon: React.ComponentType<{ size?: number }>
}[] = [
  { id: 'mat', label: '物料', Icon: Plus },
  { id: 'layers', label: '图层', Icon: Layers },
  { id: 'data', label: '数据', Icon: Database },
  { id: 'assets', label: '资源', Icon: Image },
  { id: 'history', label: '历史', Icon: History },
]

/**
 * 48px vertical icon rail (variant B). Click the active icon again to
 * collapse the secondary panel (sets active = null).
 */
export function IconRail({ active, onChange }: IconRailProps) {
  return (
    <div className="flex w-12 shrink-0 flex-col items-center gap-0.5 border-r border-border bg-card py-2">
      {ITEMS.map((it) => {
        const isActive = it.id === active
        return (
          <Tooltip key={it.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onChange(isActive ? null : it.id)}
                aria-pressed={isActive}
                className={cn(
                  'flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <it.Icon size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{it.label}</TooltipContent>
          </Tooltip>
        )
      })}
      <div className="flex-1" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="mb-1.5">
            <Settings size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">设置</TooltipContent>
      </Tooltip>
    </div>
  )
}
