import * as React from 'react'
import { Database, History, Image, Layers, Plus, Settings } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

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
    <div
      className="flex shrink-0 flex-col items-center gap-0.5 border-r py-2"
      style={{
        width: 'var(--rail-w)',
        background: 'var(--panel-bg)',
        borderColor: 'var(--border)',
      }}
    >
      {ITEMS.map((it) => {
        const isActive = it.id === active
        return (
          <Tooltip key={it.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onChange(isActive ? null : it.id)}
                aria-pressed={isActive}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border-none"
                style={{
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-2)',
                }}
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
          <button className="btn btn-ghost-icon mb-1.5">
            <Settings size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">设置</TooltipContent>
      </Tooltip>
    </div>
  )
}
