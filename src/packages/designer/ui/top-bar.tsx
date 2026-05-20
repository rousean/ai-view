import * as React from 'react'
import {
  ChevronDown,
  Eye,
  History,
  Minus,
  MoreHorizontal,
  Plus,
  Redo2,
  Send,
  Share2,
  Undo2,
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import {
  useDashboardEditor,
  useDocumentState,
  useEditorState,
} from '../editor/editor-context'

/**
 * Top toolbar — Figma-style.
 *   [Logo] / [Project Name] ● 已自动保存  ｜ undo redo zoom history ｜ avatars 预览 分享 发布 more
 *
 * Uses the design system's `.btn / .btn-ghost-icon / .btn-primary` classes
 * (defined in `designer/styles/editor.css`).
 */
export function TopBar() {
  const editor = useDashboardEditor()
  const projectName = useDocumentState((s) => s.project?.name ?? '')
  const scale = useEditorState((s) => s.camera.scale)

  // Force re-evaluate canUndo / canRedo on history changes.
  const [, force] = React.useReducer((x) => x + 1, 0)
  React.useEffect(() => editor.bus.on('history.applied', () => force()), [editor])
  React.useEffect(() => editor.bus.on('history.undone', () => force()), [editor])
  React.useEffect(() => editor.bus.on('history.redone', () => force()), [editor])

  return (
    <div
      className="flex h-[var(--topbar-h)] shrink-0 items-center gap-1.5 border-b pr-2 pl-3"
      style={{
        background: 'var(--panel-bg)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Left: logo + project name + auto-save */}
      <div className="flex min-w-0 items-center gap-2.5">
        <Logo size={20} />
        <span className="t-3 text-xs">/</span>
        <ProjectNameEditor name={projectName} />
        <span className="t-4 t-xs ml-1">● 已自动保存</span>
      </div>

      {/* Center: undo / redo / zoom / history */}
      <div className="flex flex-1 justify-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="btn btn-ghost-icon"
              onClick={() => editor.undo()}
              disabled={!editor.canUndo()}
            >
              <Undo2 size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>撤销 ⌘Z</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="btn btn-ghost-icon"
              onClick={() => editor.redo()}
              disabled={!editor.canRedo()}
            >
              <Redo2 size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>重做 ⌘⇧Z</TooltipContent>
        </Tooltip>
        <div className="divider-v h-[18px] self-center" />
        <ZoomMenu scale={scale} />
        <div className="divider-v h-[18px] self-center" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="btn btn-ghost-icon" disabled>
              <History size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>历史版本 · 即将上线</TooltipContent>
        </Tooltip>
      </div>

      {/* Right: collaborators + preview / share / publish + more.
           Preview / Share / More are visual-only placeholders right now —
           disabled with explanatory tooltips so it's clear they exist on
           purpose but aren't wired yet. */}
      <div className="flex items-center gap-2">
        <Avatars />
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="btn" disabled>
              <Eye size={14} /> 预览
            </button>
          </TooltipTrigger>
          <TooltipContent>预览 · 即将上线</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="btn" disabled>
              <Share2 size={14} /> 分享
            </button>
          </TooltipTrigger>
          <TooltipContent>分享 · 即将上线</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="btn btn-primary" onClick={() => editor.save()}>
              <Send size={14} /> 发布
            </button>
          </TooltipTrigger>
          <TooltipContent>保存当前项目到 localStorage</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="btn btn-ghost-icon" disabled>
              <MoreHorizontal size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>更多 · 即将上线</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

// ─── Logo ───────────────────────────────────────────────────────────

function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#0d99ff" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" fill="#14ae5c" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#fbbf24" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" fill="#a259ff" />
    </svg>
  )
}

// ─── Project name (inline editable) ─────────────────────────────────

function ProjectNameEditor({ name }: { name: string }) {
  const editor = useDashboardEditor()
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(name)
  React.useEffect(() => setDraft(name), [name])

  const commit = () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== name) editor.execute('project.rename', { name: trimmed })
  }

  if (editing) {
    return (
      <input
        // Inline-edit input is user-initiated (click to start editing), so
        // autoFocus is the right UX. Suppressing the generic a11y rule.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        className="input h-7 w-[220px] text-[13px] font-medium"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setDraft(name)
            setEditing(false)
          }
        }}
      />
    )
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="btn h-7 px-2 text-[13px] font-medium"
      title="点击重命名"
    >
      {name || '未命名'}
    </button>
  )
}

// ─── Zoom menu ──────────────────────────────────────────────────────

function ZoomMenu({ scale }: { scale: number }) {
  const editor = useDashboardEditor()
  const presets = [0.25, 0.5, 0.75, 1, 1.5, 2]
  return (
    <div className="flex items-center gap-0.5">
      <button
        className="btn btn-ghost-icon"
        onClick={() => editor.zoomBy(-0.1)}
        aria-label="缩小"
      >
        <Minus size={14} />
      </button>
      <Popover>
        <PopoverTrigger asChild>
          <button className="btn w-16 p-0">
            <span className="t-num">{Math.round(scale * 100)}%</span>
            <ChevronDown size={12} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          sideOffset={4}
          className="w-40 rounded-md border p-1"
          style={{
            background: 'var(--panel-bg)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-popover)',
          }}
        >
          {presets.map((z) => (
            <button
              key={z}
              className="btn flex h-7 w-full justify-between px-2"
              onClick={() => editor.setCamera({ scale: z })}
            >
              <span>缩放至 {Math.round(z * 100)}%</span>
            </button>
          ))}
          <div className="divider-h my-1" />
          <button
            className="btn flex h-7 w-full justify-between px-2"
            onClick={() => editor.resetView()}
          >
            <span>适应屏幕</span>
            <span className="t-4">⌘1</span>
          </button>
        </PopoverContent>
      </Popover>
      <button
        className="btn btn-ghost-icon"
        onClick={() => editor.zoomBy(0.1)}
        aria-label="放大"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

// ─── Avatars (decorative placeholder) ───────────────────────────────

function Avatars() {
  const stack: Array<[string, string]> = [
    ['Y', '#0d99ff'],
    ['L', '#14ae5c'],
    ['+2', '#8a8a8a'],
  ]
  return (
    <div className="mr-1 flex">
      {stack.map(([label, bg], i) => (
        <div
          key={i}
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-[11px] font-medium text-white"
          style={{
            background: bg,
            borderColor: 'var(--panel-bg)',
            marginLeft: i === 0 ? 0 : -6,
          }}
        >
          {label}
        </div>
      ))}
    </div>
  )
}
