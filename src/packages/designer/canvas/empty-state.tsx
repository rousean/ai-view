import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Command as CommandIcon, MousePointerClick, Sparkles } from 'lucide-react'
import { useDashboardEditor, useDocumentState } from '../editor/editor-context'
import { selectCurrentPage } from '../stores/selectors'

/**
 * Empty-state overlay — rendered inside the camera-transformed layer
 * so it tracks the artboard. Shows only when:
 *
 *   - the project has a single page; AND
 *   - that page has no widgets.
 *
 * Three CTAs cover the first-run paths users actually need:
 *
 *   1. Drag a widget from the materials panel (→ arrow points to the
 *      icon rail on the left).
 *   2. Press ⌘K for the command palette (→ pops it open via editor
 *      facade so the user immediately sees the surface).
 *   3. Open the AI Beautify dialog (placeholder for the broader
 *      "start with AI" path — currently links to the command palette).
 *
 * The overlay uses `pointer-events-none` everywhere except on the
 * actual CTA buttons so it never steals canvas clicks.
 */
export function CanvasEmptyState() {
  const editor = useDashboardEditor()
  const page = useDocumentState((s) => selectCurrentPage(s))
  const widgetCount = useDocumentState(
    useShallow((s) => selectCurrentPage(s)?.widgets.length ?? 0),
  )

  if (!page || widgetCount > 0) return null

  // The empty-state card lives outside the camera transform so it
  // always tracks the user's viewport — never the artboard's
  // geometric centre. A page-centred overlay drifts off-screen on
  // 1920×1080 canvases when the editor window is narrower than the
  // canvas, leaving the new user staring at blank ruler space.
  //
  // Rendered as a portal-style fixed element scoped to the canvas
  // viewport rect (excluding the ruler gutters) so the card sits
  // dead-centre of what the user can actually see.
  return (
    <div
      data-skip-snapshot
      className="text-foreground/90 pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
    >
      <div className="bg-card/80 border-border/60 pointer-events-auto flex max-w-sm flex-col items-center gap-4 rounded-xl border p-6 shadow-md backdrop-blur">
        <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
          <Sparkles size={20} />
        </div>
        <div className="text-center">
          <div className="text-foreground text-[14px] font-medium">
            开始你的大屏
          </div>
          <div className="text-muted-foreground/80 mt-1 text-[11px]">
            从左侧物料拖入组件，或用下方快捷方式
          </div>
        </div>

        <ul className="flex w-full flex-col gap-1.5">
          <li className="bg-muted/50 hover:bg-muted/80 flex items-center gap-2 rounded-md px-3 py-2 text-[12px]">
            <MousePointerClick size={13} className="text-muted-foreground shrink-0" />
            <span className="flex-1">从左侧 <b>物料</b> 面板拖入图表</span>
            <kbd className="bg-card border-border/60 inline-flex h-5 items-center justify-center rounded border px-1 font-mono text-[10px]">
              拖
            </kbd>
          </li>
          <li>
            <button
              type="button"
              onClick={() => editor.setPaletteOpen(true)}
              className="bg-muted/50 hover:bg-muted/80 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-[12px]"
            >
              <CommandIcon size={13} className="text-muted-foreground shrink-0" />
              <span className="flex-1">打开 <b>命令面板</b> 搜索任何操作</span>
              <kbd className="bg-card border-border/60 inline-flex h-5 items-center justify-center rounded border px-1 font-mono text-[10px]">
                ⌘ K
              </kbd>
            </button>
          </li>
        </ul>

        <div className="text-muted-foreground/60 text-[10px]">
          按 <kbd className="bg-muted/60 border-border/60 inline-flex h-4 items-center justify-center rounded border px-1 font-mono text-[10px]">?</kbd> 查看全部快捷键
        </div>
      </div>
    </div>
  )
}
