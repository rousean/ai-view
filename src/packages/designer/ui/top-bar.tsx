import * as React from 'react'
import { Camera, Eye, PanelRight, Send } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import {
  useDashboardEditor,
  useDocumentState,
  useEditorState,
} from '../editor/editor-context'
import { exportElementToPng } from '../export/screenshot'
import { useRuntimeStore } from '../stores/runtime-store'
import { toast } from '~/components/ui/sonner'

/**
 * Top toolbar — Figma-style.
 *   [Logo] / [Project Name] ● 已自动保存  ｜ undo redo zoom history ｜ avatars 预览 分享 发布 more
 */
export function TopBar() {
  const editor = useDashboardEditor()
  const projectName = useDocumentState((s) => s.project?.name ?? '')
  const rightCollapsed = useEditorState((s) => s.rightCollapsed)
  const setRightCollapsed = useEditorState((s) => s.actions.setRightCollapsed)

  // Refresh the save indicator when the document's dirty / saved state
  // changes. (Undo/redo moved to the canvas toolbar.)
  const [, force] = React.useReducer((x) => x + 1, 0)
  React.useEffect(() => {
    const off = [
      editor.bus.on('document.dirty', () => force()),
      editor.bus.on('document.saved', () => force()),
    ]
    return () => off.forEach((fn) => fn())
  }, [editor])

  return (
    <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-border bg-card pr-2 pl-3">
      {/* Left: logo + project name + save status */}
      <div className="flex min-w-0 items-center gap-2.5">
        <Logo size={20} />
        <span className="text-muted-foreground/80 text-xs">/</span>
        <ProjectNameEditor name={projectName} />
        <SaveIndicator editor={editor} />
      </div>

      {/* Spacer pushes the two ends apart. The centre is intentionally
          empty now — zoom lives bottom-right, history in the left rail. */}
      <div className="flex-1" />

      {/* Right: collaborators + preview / share / publish + more.
           Preview / Share / More are visual-only placeholders right now —
           disabled with explanatory tooltips so it's clear they exist on
           purpose but aren't wired yet. */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setRightCollapsed(!rightCollapsed)}
              aria-label="属性面板"
              className={cn(!rightCollapsed && 'text-primary')}
            >
              <PanelRight size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{rightCollapsed ? '显示属性面板' : '隐藏属性面板'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => useRuntimeStore.getState().actions.setMode('preview')}
            >
              <Eye size={14} /> 预览
            </Button>
          </TooltipTrigger>
          <TooltipContent>进入预览模式 · ESC 退出</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => captureCanvasNow(projectName)}>
              <Camera size={14} /> 截图
            </Button>
          </TooltipTrigger>
          <TooltipContent>下载当前页 PNG</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              onClick={() => {
                editor
                  .save()
                  .then(() => toast.success('已保存'))
                  .catch((err) =>
                    toast.error('保存失败', { description: (err as Error).message }),
                  )
              }}
            >
              <Send size={14} /> 发布
            </Button>
          </TooltipTrigger>
          <TooltipContent>保存当前项目到 localStorage</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

/**
 * Capture the current page artboard as PNG. We target the page
 * background node by data-attribute (`data-snapshot-target="canvas"`)
 * — that's set on the artboard so we capture just the visible canvas
 * rectangle, not the surrounding chrome / ruler / panels.
 *
 * Falls back to alerting the user if the target is missing — fail loud
 * rather than producing an empty download.
 */
async function captureCanvasNow(projectName: string): Promise<void> {
  if (typeof document === 'undefined') return
  const target = document.querySelector<HTMLElement>('[data-snapshot-target="canvas"]')
  if (!target) {
    toast.error('截图失败', { description: '未找到画布节点' })
    return
  }
  const safeName = (projectName || 'screenshot').replace(/[\\/:*?"<>|]+/g, '_')
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
  const filename = `${safeName}-${stamp}.png`
  try {
    await exportElementToPng(target, filename)
    toast.success('截图已下载', { description: filename })
  } catch (err) {
    console.error('[screenshot] failed', err)
    toast.error('截图失败', { description: (err as Error).message })
  }
}

/**
 * Project save state — three flavours:
 *
 *   - saving        spinner-y "保存中…"
 *   - dirty         orange dot + "未保存的更改"
 *   - clean+saved   muted "已保存 HH:MM"
 *   - clean+never   muted "未修改"
 *
 * The clock under "saved at" ticks once a minute so the label stays
 * fresh ("已保存 12:01" → "已保存 12:02").
 */
function SaveIndicator({ editor }: { editor: ReturnType<typeof useDashboardEditor> }) {
  const dirty = editor.isDirty()
  const saving = editor.isSaving()
  const lastSavedAt = editor.getLastSavedAt()

  // Refresh once a minute so "已保存 12:01" updates without an event.
  const [, force] = React.useReducer((x) => x + 1, 0)
  React.useEffect(() => {
    const id = setInterval(() => force(), 60_000)
    return () => clearInterval(id)
  }, [])

  if (saving) {
    return (
      <span className="text-muted-foreground/80 ml-1 text-[11px]">
        ● 保存中…
      </span>
    )
  }
  if (dirty) {
    return (
      <span className="ml-1 text-[11px] text-amber-500" title="有未保存的更改 (⌘S 立即保存)">
        ● 未保存的更改
      </span>
    )
  }
  if (lastSavedAt) {
    const hh = String(lastSavedAt.getHours()).padStart(2, '0')
    const mm = String(lastSavedAt.getMinutes()).padStart(2, '0')
    return (
      <span className="text-muted-foreground/60 ml-1 text-[11px]" title={lastSavedAt.toLocaleString()}>
        ● 已保存 {hh}:{mm}
      </span>
    )
  }
  return <span className="text-muted-foreground/40 ml-1 text-[11px]">● 未修改</span>
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
      <Input
        // Inline-edit input is user-initiated (click to start editing), so
        // autoFocus is the right UX. Suppressing the generic a11y rule.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        className="h-7 w-[220px] text-[13px] font-medium"
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
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setEditing(true)}
      className="px-2 text-[13px] font-medium"
      title="点击重命名"
    >
      {name || '未命名'}
    </Button>
  )
}
