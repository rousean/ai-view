import * as React from 'react'
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
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
 * Three slots, each conditionally rendered:
 *   - Tools group (always)        select / pan / placeholders / fit
 *   - Align group (≥ 1 selected)  6 align buttons; anchors to page when
 *                                  single selection, to selection bbox
 *                                  when multi
 *   - Distribute group (≥ 3)      horizontal / vertical equal-gap
 */
export function FloatingTools() {
  const editor = useDashboardEditor()
  const tool = useEditorState((s) => s.tool)
  const selectedIds = useEditorState((s) => s.selectedIds)
  const count = selectedIds.length

  return (
    <div className="bg-card border-border absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-px rounded-lg border p-1 shadow-md">
      {/* ── Tools ───────────────────────────────────────────────── */}
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

      {/* ── Align ───────────────────────────────────────────────── */}
      {count >= 1 && (
        <>
          <Divider />
          <ToolButton
            label={count === 1 ? '左对齐画布' : '左对齐'}
            icon={AlignStartVertical}
            onClick={() => editor.alignSelection('left')}
          />
          <ToolButton
            label={count === 1 ? '水平居中画布' : '水平居中'}
            icon={AlignCenterVertical}
            onClick={() => editor.alignSelection('h-center')}
          />
          <ToolButton
            label={count === 1 ? '右对齐画布' : '右对齐'}
            icon={AlignEndVertical}
            onClick={() => editor.alignSelection('right')}
          />
          <ToolButton
            label={count === 1 ? '顶对齐画布' : '顶对齐'}
            icon={AlignStartHorizontal}
            onClick={() => editor.alignSelection('top')}
          />
          <ToolButton
            label={count === 1 ? '垂直居中画布' : '垂直居中'}
            icon={AlignCenterHorizontal}
            onClick={() => editor.alignSelection('v-center')}
          />
          <ToolButton
            label={count === 1 ? '底对齐画布' : '底对齐'}
            icon={AlignEndHorizontal}
            onClick={() => editor.alignSelection('bottom')}
          />
        </>
      )}

      {/* ── Distribute (needs ≥ 3) ──────────────────────────────── */}
      {count >= 3 && (
        <>
          <Divider />
          <ToolButton
            label="水平等距分布"
            icon={AlignHorizontalDistributeCenter}
            onClick={() => editor.distributeSelection('horizontal')}
          />
          <ToolButton
            label="垂直等距分布"
            icon={AlignVerticalDistributeCenter}
            onClick={() => editor.distributeSelection('vertical')}
          />
        </>
      )}
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
