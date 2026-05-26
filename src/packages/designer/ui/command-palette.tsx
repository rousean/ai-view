import * as React from 'react'
import { Plus, ChevronRight } from 'lucide-react'
import type { WidgetMeta } from '@widgets/widget-meta'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '~/components/ui/command'
import {
  useDashboardEditor,
  useDocumentState,
  useEditorState,
} from '../editor/editor-context'
import { DEFAULT_SHORTCUTS, type ShortcutDef } from '../editor/keyboard-shortcuts'
import { selectPages } from '../stores/selectors'

/**
 * `Cmd+K` command palette.
 *
 * Pulls actions from three places, so there's a single "where is X"
 * surface that doesn't go stale as features land:
 *
 *   - **Commands** — every `ShortcutDef` in `DEFAULT_SHORTCUTS`, gated
 *     by its own `when` predicate (so e.g. "Delete" only shows when
 *     something is selected). Search by `description`, with the hot-
 *     key rendered as a `CommandShortcut` hint.
 *   - **Add widget** — every registered widget type from
 *     `editor.registry.widgets`, dropped onto the page centre.
 *   - **Switch page** — every page on the current project.
 */
export function CommandPalette() {
  const editor = useDashboardEditor()
  // Open-state lives on EditorStore so other actors (canvas double-
  // click, command-palette button in the topbar, etc.) can pop the
  // palette without needing a ref to this component.
  const open = useEditorState((s) => s.paletteOpen)
  const setOpen = React.useCallback(
    (next: boolean) => editor.setPaletteOpen(next),
    [editor],
  )

  // Cmd+K toggle. Listens at window level so the trigger works no matter
  // which editor element has focus; skip when typing in an input so
  // `Cmd+K` inside the search field doesn't immediately close it.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isToggle =
        (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k'
      if (!isToggle) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        // Allow Cmd+K inside the palette's own input to close it; close
        // any other case where the user happens to be typing.
        if (!open) return
      }
      e.preventDefault()
      setOpen(!open)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  // Live data for the entries.
  const selectedIds = useEditorState((s) => s.selectedIds)
  const pages = useDocumentState((s) => selectPages(s))
  const currentPageId = useDocumentState((s) => s.project?.currentPageId ?? null)

  // Snapshot widget registry — list() is reactive in spirit but we don't
  // need to re-render the palette on register/unregister; closing and
  // reopening is fine.
  const widgetMetas = React.useMemo(
    () => editor.registry.widgets.list() as unknown as WidgetMeta[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  )

  // Filter ShortcutDefs that pass their `when` for the current selection.
  const visibleShortcuts = React.useMemo(() => {
    const ctx = {
      editor,
      hasSelection: selectedIds.length > 0,
      selectionCount: selectedIds.length,
    }
    return DEFAULT_SHORTCUTS.filter((s) => !s.when || s.when(ctx))
  }, [editor, selectedIds])

  const runAndClose = (fn: () => void) => {
    setOpen(false)
    // Defer execution so the dialog closes before mutations re-render
    // (avoids a flash of the palette over the new state).
    queueMicrotask(fn)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="命令面板" description="搜索操作、部件、页面">
      <CommandInput placeholder="搜索操作、添加部件、跳转页面…" />
      <CommandList>
        <CommandEmpty>没有匹配项</CommandEmpty>

        <CommandGroup heading="操作">
          {visibleShortcuts.map((s, i) => {
            const hint = formatBinding(s)
            return (
              <CommandItem
                key={`shortcut-${i}-${s.description}`}
                value={`${s.description} ${hint}`}
                onSelect={() => runAndClose(() => s.run(editor, new KeyboardEvent('keydown')))}
              >
                <ChevronRight />
                <span className="flex-1">{s.description}</span>
                {hint && <CommandShortcut>{hint}</CommandShortcut>}
              </CommandItem>
            )
          })}
        </CommandGroup>

        {widgetMetas.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="添加部件">
              {widgetMetas.map((meta) => (
                <CommandItem
                  key={`add-${meta.type}`}
                  value={`添加 ${meta.title} ${meta.type} ${meta.tags?.join(' ') ?? ''}`}
                  onSelect={() =>
                    runAndClose(() => addWidgetAtCenter(editor, meta))
                  }
                >
                  <Plus />
                  <span className="flex-1">添加 {meta.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {pages.length > 1 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="跳转页面">
              {pages.map((p) => (
                <CommandItem
                  key={`page-${p.id}`}
                  value={`跳转 ${p.name}`}
                  onSelect={() => runAndClose(() => editor.switchPage(p.id))}
                  disabled={p.id === currentPageId}
                >
                  <ChevronRight />
                  <span className="flex-1">{p.name}</span>
                  {p.id === currentPageId && (
                    <span className="text-muted-foreground text-[10px]">当前</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────

function addWidgetAtCenter(
  editor: ReturnType<typeof useDashboardEditor>,
  meta: WidgetMeta,
): void {
  const page = editor.getCurrentPage()
  if (!page) return
  const size = meta.defaultLayout
  const position = {
    x: Math.max(0, Math.floor((page.canvas.width - size.width) / 2)),
    y: Math.max(0, Math.floor((page.canvas.height - size.height) / 2)),
  }
  editor.addWidget(meta.type, {
    position,
    size,
    props: meta.defaultProps as Record<string, unknown>,
  })
}

/**
 * Render a `ShortcutDef`'s key + modifiers as a compact glyph string
 * (e.g. "⌘⇧Z"). Returns empty when neither key nor mods make sense to
 * surface (shouldn't happen, but defensive for malformed bindings).
 */
function formatBinding(def: ShortcutDef): string {
  const out: string[] = []
  if (def.mod?.includes('cmd')) out.push('⌘')
  if (def.mod?.includes('alt')) out.push('⌥')
  if (def.mod?.includes('shift')) out.push('⇧')
  out.push(formatKey(def.key))
  return out.join('')
}

function formatKey(key: string): string {
  const SPECIAL: Record<string, string> = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Escape: 'Esc',
    Enter: '↵',
    Delete: '⌫',
    Backspace: '⌫',
    Tab: '⇥',
    ' ': 'Space',
  }
  return SPECIAL[key] ?? key.toUpperCase()
}
