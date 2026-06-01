import * as React from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '~/components/ui/context-menu'
import { useDashboardEditor, useEditorState } from '../editor/editor-context'

/**
 * Right-click menu for the canvas surface.
 *
 * Two menus, picked by what's under the cursor at right-click time:
 *
 *   - Widget menu — fires when the cursor sits on (or inside) an element
 *     carrying `data-widget-id`. If that widget isn't in the current
 *     selection, we auto-select it first (matches every OS file-manager
 *     and Figma).
 *   - Canvas menu — fires on blank artboard / pasteboard. Holds paste +
 *     view toggles + the common navigation actions.
 *
 * Menu items just call the existing DashboardEditor facade methods, so
 * shortcuts and menu items always do exactly the same thing.
 */
export function CanvasContextMenu({ children }: { children: React.ReactNode }) {
  const editor = useDashboardEditor()
  const selectedIds = useEditorState((s) => s.selectedIds)
  const view = useEditorState((s) => s.view)

  // `null` means "the next open is on the canvas surface".
  const [targetWidgetId, setTargetWidgetId] = React.useState<string | null>(null)

  /**
   * Capture-phase handler so we run BEFORE radix's own context-menu
   * opener (which lives on the Trigger). At this point we figure out
   * what was clicked, fix the selection if needed, and stash it for
   * the content renderer below — no preventDefault, so radix still
   * pops the menu after we return.
   */
  const handleContextMenuCapture = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-widget-id]')
    const id = el?.dataset.widgetId ?? null
    if (id) {
      // Right-clicking a widget outside the current selection should
      // collapse the selection onto it (Figma + every file manager).
      if (!selectedIds.includes(id)) editor.selectOne(id)
    }
    setTargetWidgetId(id)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="contents" onContextMenuCapture={handleContextMenuCapture}>
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {targetWidgetId ? (
          <WidgetMenu editor={editor} selectionCount={selectedIds.length} />
        ) : (
          <CanvasMenu editor={editor} view={view} />
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

// ─── Widget menu ─────────────────────────────────────────────────────

function WidgetMenu({
  editor,
  selectionCount,
}: {
  editor: ReturnType<typeof useDashboardEditor>
  selectionCount: number
}) {
  const selected = editor.getSelectedWidgets()
  const allLocked = selected.length > 0 && selected.every((w) => w.flags.locked)
  const allHidden = selected.length > 0 && selected.every((w) => w.flags.hidden)
  const groupId = selected[0]?.groupId
  const ids = selected.map((w) => w.id)

  return (
    <>
      <ContextMenuItem onSelect={() => void editor.copySelection()}>
        复制
        <ContextMenuShortcut>⌘C</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => void editor.cutSelection()}>
        剪切
        <ContextMenuShortcut>⌘X</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => void editor.pasteFromClipboard()}>
        粘贴
        <ContextMenuShortcut>⌘V</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => editor.duplicateSelection()}>
        复制副本
        <ContextMenuShortcut>⌘D</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem onSelect={() => editor.bringForward(ids)}>
        上移一层
        <ContextMenuShortcut>⌘]</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => editor.sendBackward(ids)}>
        下移一层
        <ContextMenuShortcut>⌘[</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => editor.bringToFront(ids)}>
        置顶
        <ContextMenuShortcut>⌘⌥]</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => editor.sendToBack(ids)}>
        置底
        <ContextMenuShortcut>⌘⌥[</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem
        disabled={selectionCount < 2}
        onSelect={() => editor.groupWidgets(ids)}
      >
        编组
        <ContextMenuShortcut>⌘G</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!groupId}
        onSelect={() => groupId && editor.ungroupWidgets(groupId)}
      >
        解组
        <ContextMenuShortcut>⌘⇧G</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem onSelect={() => editor.toggleLockedOnSelection()}>
        {allLocked ? '解锁' : '锁定'}
        <ContextMenuShortcut>⌘⇧L</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => editor.toggleHiddenOnSelection()}>
        {allHidden ? '显示' : '隐藏'}
        <ContextMenuShortcut>⌘⇧H</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem onSelect={() => editor.flipHorizontal(ids)}>
        水平翻转
        <ContextMenuShortcut>⇧H</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => editor.flipVertical(ids)}>
        垂直翻转
        <ContextMenuShortcut>⇧V</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem variant="destructive" onSelect={() => editor.removeWidgets(ids)}>
        删除
        <ContextMenuShortcut>⌫</ContextMenuShortcut>
      </ContextMenuItem>
    </>
  )
}

// ─── Canvas menu ─────────────────────────────────────────────────────

function CanvasMenu({
  editor,
  view,
}: {
  editor: ReturnType<typeof useDashboardEditor>
  view: { showGrid: boolean; showGuides: boolean; showRulers: boolean }
}) {
  return (
    <>
      <ContextMenuItem onSelect={() => void editor.pasteFromClipboard()}>
        粘贴
        <ContextMenuShortcut>⌘V</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => editor.selectAll()}>
        全选
        <ContextMenuShortcut>⌘A</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem onSelect={() => editor.toggleView('showGrid')}>
        {view.showGrid ? '隐藏网格' : '显示网格'}
        <ContextMenuShortcut>⌘'</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => editor.toggleView('showGuides')}>
        {view.showGuides ? '隐藏参考线' : '显示参考线'}
        <ContextMenuShortcut>⌘;</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => editor.toggleView('showRulers')}>
        {view.showRulers ? '隐藏标尺' : '显示标尺'}
        <ContextMenuShortcut>⌘⇧R</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem onSelect={() => editor.fitToScreen()}>
        适应屏幕
        <ContextMenuShortcut>⌘1</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => editor.setCamera({ scale: 1, x: 0, y: 0 })}>
        缩放到 100%
        <ContextMenuShortcut>⌘0</ContextMenuShortcut>
      </ContextMenuItem>
    </>
  )
}
