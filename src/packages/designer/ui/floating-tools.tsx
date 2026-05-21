import * as React from 'react'
import {
  Hand,
  Maximize,
  Minus,
  MousePointer2,
  Sparkles,
  Square,
  Type as TextIcon,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import { useDashboardEditor, useEditorState } from '../editor/editor-context'

/**
 * Floating tool palette pinned to top-centre of the canvas (variant B).
 *
 * Currently wires:
 *   - "选择 / 抓手"  → editor.setTool (real)
 *   - "适应屏幕"    → editor.resetView (real)
 *
 * Disabled placeholders (visible but inactive):
 *   - 矩形 / 连线 / 文本 / AI 生成
 * These are valid design slots; we'll enable them when the corresponding
 * tools land. They render with `disabled` cursor + tooltip "即将上线".
 */
export function FloatingTools() {
  const editor = useDashboardEditor()
  const tool = useEditorState((s) => s.tool)

  return (
    <div className="bg-card border-border absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-px rounded-lg border p-1 shadow-md">
      <ToolButton
        label="选择 · V"
        icon={MousePointer2}
        onClick={() => editor.setTool('select')}
        active={tool === 'select'}
      />
      <ToolButton
        label="抓手 · H"
        icon={Hand}
        onClick={() => editor.setTool('pan')}
        active={tool === 'pan'}
      />
      <Divider />
      <ToolButton label="矩形 · R" icon={Square} placeholder />
      <ToolButton label="连线 · L" icon={Minus} placeholder />
      <ToolButton label="文本 · T" icon={TextIcon} placeholder />
      <Divider />
      <ToolButton label="AI 生成 · G" icon={Sparkles} placeholder />
      <Divider />
      <ToolButton label="适应屏幕" icon={Maximize} onClick={() => editor.resetView()} />
    </div>
  )
}

interface ToolButtonProps {
  label: string
  icon: React.ComponentType<{ size?: number }>
  onClick?: () => void
  active?: boolean
  /** When true, render as a visible-but-disabled placeholder. */
  placeholder?: boolean
}

function ToolButton({ label, icon: Icon, onClick, active, placeholder }: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={placeholder ? undefined : onClick}
          disabled={placeholder}
          aria-label={label}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-sm transition-colors',
            placeholder
              ? 'text-muted-foreground/40 cursor-not-allowed opacity-70'
              : active
                ? 'bg-primary/10 text-primary cursor-pointer'
                : 'text-foreground hover:bg-muted cursor-pointer',
          )}
        >
          <Icon size={14} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {placeholder ? `${label} · 即将上线` : label}
      </TooltipContent>
    </Tooltip>
  )
}

function Divider() {
  return <div aria-hidden className="bg-border mx-[3px] h-4 w-px" />
}
