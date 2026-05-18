import * as React from 'react'
import { Database, History, Image, Layers, Plus, Settings } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

export type RailKey = 'mat' | 'layers' | 'data' | 'assets' | 'history' | null

interface IconRailProps {
  active: RailKey
  onChange: (next: RailKey) => void
}

const ITEMS: { id: Exclude<RailKey, null>; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
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
      style={{
        width: 'var(--rail-w)',
        flexShrink: 0,
        background: 'var(--panel-bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 0',
        gap: 2,
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
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  border: 'none',
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <it.Icon size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{it.label}</TooltipContent>
          </Tooltip>
        )
      })}
      <div style={{ flex: 1 }} />
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="btn btn-ghost-icon" style={{ marginBottom: 6 }}>
            <Settings size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">设置</TooltipContent>
      </Tooltip>
    </div>
  )
}
