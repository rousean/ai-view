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
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        padding: 4,
        background: 'var(--panel-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        gap: 1,
      }}
    >
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

// Defined at module scope (not inside FloatingTools) — react-hooks/
// static-components disallows component definitions inside components
// because each render produces a new identity, breaking memoization.
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
          style={{
            width: 28,
            height: 28,
            padding: 0,
            border: 'none',
            borderRadius: 'var(--r-sm)',
            background: active ? 'var(--accent-soft)' : 'transparent',
            color: active ? 'var(--accent)' : placeholder ? 'var(--text-4)' : 'var(--text-1)',
            cursor: placeholder ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: placeholder ? 0.7 : 1,
          }}
          aria-label={label}
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
  return (
    <div
      aria-hidden
      style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 3px' }}
    />
  )
}
