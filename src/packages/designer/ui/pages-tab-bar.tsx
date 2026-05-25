import * as React from 'react'
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '~/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '~/components/ui/context-menu'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'
import { useDashboardEditor, useDocumentState, useEditorState } from '../editor/editor-context'
import { selectPages } from '../stores/selectors'

/**
 * Bottom tab strip showing every page in the current project.
 *
 *   - click a tab          → editor.switchPage
 *   - double-click a tab   → inline rename (Enter commits, Esc cancels)
 *   - right-click          → rename / duplicate / delete
 *   - + button             → editor.addPage
 *
 * Active tab follows `project.currentPageId`. Horizontal scroll for
 * many pages. Single-page projects still render the strip so the +
 * button is always reachable.
 */
export function PagesTabBar() {
  const editor = useDashboardEditor()
  const pages = useDocumentState(useShallow((s) => selectPages(s)))
  const currentPageId = useDocumentState((s) => s.project?.currentPageId ?? null)
  const selectedCount = useEditorState((s) => s.selectedIds.length)
  const scale = useEditorState((s) => s.camera.scale)
  const mouse = useEditorState((s) => s.mouseCanvasPos)

  return (
    <div className="border-border bg-card flex h-9 shrink-0 items-center gap-0.5 border-t px-2">
      <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {pages.map((p) => (
          <PageTab
            key={p.id}
            id={p.id}
            name={p.name}
            active={p.id === currentPageId}
            canDelete={pages.length > 1}
          />
        ))}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="新建页面"
          onClick={() => editor.addPage()}
        >
          <Plus />
        </Button>
      </div>
      {/* Status strip — pushed to the right. Three metrics, separated
          by a thin divider; each item hides itself when irrelevant so
          the strip stays tight when there's nothing to show. */}
      <div className="text-muted-foreground/80 ml-auto flex items-center gap-3 px-2 text-[11px] tabular-nums">
        {mouse && (
          <span title="鼠标位置（画布坐标）">
            X {Math.round(mouse.x)} · Y {Math.round(mouse.y)}
          </span>
        )}
        {selectedCount > 0 && <span>选中 {selectedCount}</span>}
        <span title="缩放">{Math.round(scale * 100)}%</span>
        <span className="text-muted-foreground/40">·</span>
        <span>{pages.length} 个页面</span>
      </div>
    </div>
  )
}

// ─── Single tab ──────────────────────────────────────────────────────

function PageTab({
  id,
  name,
  active,
  canDelete,
}: {
  id: string
  name: string
  active: boolean
  canDelete: boolean
}) {
  const editor = useDashboardEditor()
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(name)
  React.useEffect(() => setDraft(name), [name])

  const commitRename = () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== name) editor.renamePage(id, trimmed)
  }

  if (editing) {
    return (
      <Input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        className="h-7 w-32 text-xs"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitRename()
          if (e.key === 'Escape') {
            setDraft(name)
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={() => editor.switchPage(id)}
          onDoubleClick={() => setEditing(true)}
          className={cn(
            'flex h-7 shrink-0 cursor-pointer items-center rounded-md px-3 text-xs whitespace-nowrap transition-colors',
            active
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {name}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        <ContextMenuItem onSelect={() => setEditing(true)}>
          <Pencil />
          重命名
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => editor.duplicatePage(id)}>
          <Copy />
          复制页面
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          disabled={!canDelete}
          onSelect={() => canDelete && editor.removePage(id)}
        >
          <Trash2 />
          删除
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
