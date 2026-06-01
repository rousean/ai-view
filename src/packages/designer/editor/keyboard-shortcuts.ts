import type { DashboardEditor } from './dashboard-editor'

/**
 * Keyboard shortcut framework.
 *
 * Goals:
 *   - Single source of truth for every binding (for docs / command palette
 *     / settings later)
 *   - Mac ⇄ Win parity (`cmd` resolves to Meta on macOS, Ctrl elsewhere)
 *   - Predictable modifier matching — pressing the WRONG modifier never
 *     matches a binding that wants a different one (no accidental triggers
 *     on `Shift+Cmd+Z` when the spec wanted `Cmd+Z`)
 *   - Bypass when focus is in an editable field — so `Cmd+A` inside an
 *     `<input>` selects the input text, not all widgets
 */

export type ShortcutMod =
  | 'cmd'
  | 'shift'
  | 'alt'
  | 'cmd+shift'
  | 'cmd+alt'
  | 'alt+shift'
  | 'cmd+alt+shift'

export interface ShortcutContext {
  editor: DashboardEditor
  hasSelection: boolean
  selectionCount: number
}

export interface ShortcutDef {
  /**
   * Matched against `e.key` case-insensitively. Use the literal value of
   * `KeyboardEvent.key`:
   *   - Printable: 'a', 'z', '=', '/', ','
   *   - Special:   'ArrowLeft', 'Escape', 'Delete', 'Backspace', 'Tab', 'Enter'
   */
  key: string
  mod?: ShortcutMod
  when?: (ctx: ShortcutContext) => boolean
  run: (editor: DashboardEditor, event: KeyboardEvent) => void
  /** Human-readable label — surfaced in tooltips and a future command palette. */
  description: string
}

// ─── Modifier matching ─────────────────────────────────────────────────

const isMac =
  typeof navigator !== 'undefined' &&
  /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent || '')

interface PressedMods {
  cmd: boolean
  shift: boolean
  alt: boolean
}

function getPressedMods(e: KeyboardEvent): PressedMods {
  return {
    cmd: isMac ? e.metaKey : e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
  }
}

function expectedMods(mod: ShortcutMod | undefined): PressedMods {
  const tokens = (mod ?? '').split('+')
  return {
    cmd: tokens.includes('cmd'),
    shift: tokens.includes('shift'),
    alt: tokens.includes('alt'),
  }
}

/** Strict modifier match — extra modifier keys are NOT allowed. */
export function matchShortcut(e: KeyboardEvent, def: ShortcutDef): boolean {
  if (e.key.toLowerCase() !== def.key.toLowerCase()) return false
  const pressed = getPressedMods(e)
  const expected = expectedMods(def.mod)
  return (
    pressed.cmd === expected.cmd &&
    pressed.shift === expected.shift &&
    pressed.alt === expected.alt
  )
}

// ─── Skip rules ────────────────────────────────────────────────────────

/**
 * Whether the keydown originated from an editable element — in which
 * case the global shortcuts must yield. We make one exception: `Escape`
 * always fires, so users can pop out of an inline editor.
 */
export function shouldSkipKeydown(e: KeyboardEvent): boolean {
  if (e.key === 'Escape') return false
  const target = e.target as HTMLElement | null
  if (!target) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

// ─── Dispatcher ────────────────────────────────────────────────────────

/**
 * Try every shortcut in order; the first one whose key + modifiers match
 * AND whose `when` predicate passes runs. Calls `preventDefault()` so
 * native browser shortcuts (Cmd+D bookmarking, etc.) don't steal events
 * we've claimed.
 *
 * Returns `true` if a shortcut consumed the event.
 */
export function runShortcut(
  e: KeyboardEvent,
  editor: DashboardEditor,
  shortcuts: ShortcutDef[] = DEFAULT_SHORTCUTS,
): boolean {
  if (shouldSkipKeydown(e)) return false
  const ids = editor.getSelectedIds()
  const ctx: ShortcutContext = {
    editor,
    hasSelection: ids.length > 0,
    selectionCount: ids.length,
  }
  for (const def of shortcuts) {
    if (!matchShortcut(e, def)) continue
    if (def.when && !def.when(ctx)) continue
    e.preventDefault()
    def.run(editor, e)
    return true
  }
  return false
}

// ─── Predicate helpers ─────────────────────────────────────────────────

const hasSelection = (c: ShortcutContext) => c.hasSelection
const hasMultiSelection = (c: ShortcutContext) => c.selectionCount >= 2

// ─── Arrow-key nudge factory ───────────────────────────────────────────
// 4 directions × 2 step sizes (1px / 10px-with-shift) = 8 bindings.
// HistoryManager's merge window collapses a continuous burst into one
// undo entry — see widget.updateLayoutBatch.mergeKey.

function nudge(
  key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown',
  dx: number,
  dy: number,
  step: 1 | 10,
): ShortcutDef {
  const dirLabel = dx < 0 ? '左' : dx > 0 ? '右' : dy < 0 ? '上' : '下'
  return {
    key,
    mod: step === 10 ? 'shift' : undefined,
    when: hasSelection,
    run: (ed) => ed.nudgeSelection(dx, dy, step),
    description: `向${dirLabel}移动 ${step}px`,
  }
}

// ─── Default bindings ──────────────────────────────────────────────────
//
// Anything that requires a future API (duplicate / copy / paste / nudge /
// align / addPage shortcuts) is intentionally absent for now; it lands
// with the matching feature task so the framework stays in sync with
// what's wired up end-to-end.

export const DEFAULT_SHORTCUTS: ShortcutDef[] = [
  // ── History ─────────────────────────────────────────────────────────
  { key: 'z', mod: 'cmd', run: (ed) => ed.undo(), description: '撤销' },
  { key: 'z', mod: 'cmd+shift', run: (ed) => ed.redo(), description: '重做' },
  { key: 'y', mod: 'cmd', run: (ed) => ed.redo(), description: '重做（Windows 习惯）' },

  // ── Save ────────────────────────────────────────────────────────────
  // Cmd+S also cancels the in-flight autosave timer (the underlying
  // facade does that), so pressing it doesn't queue a duplicate save.
  { key: 's', mod: 'cmd', run: (ed) => void ed.save(), description: '保存' },

  // ── Selection ───────────────────────────────────────────────────────
  { key: 'a', mod: 'cmd', run: (ed) => ed.selectAll(), description: '全选' },
  {
    key: 'a',
    mod: 'cmd+shift',
    when: hasSelection,
    run: (ed) => {
      const primaryId = ed.getSelectedIds()[0]
      const primary = primaryId ? ed.getWidget(primaryId) : null
      if (!primary) return
      const sameType = ed
        .getAllWidgets()
        .filter((w) => w.type === primary.type)
        .map((w) => w.id)
      if (sameType.length > 0) ed.select(sameType)
    },
    description: '选择所有同类型',
  },
  { key: 'Escape', when: hasSelection, run: (ed) => ed.selectNone(), description: '取消选择' },
  { key: 'Tab', run: (ed) => ed.selectNext(), description: '选择下一个部件' },
  {
    key: 'F2',
    when: hasSelection,
    run: (ed) => ed.requestRename(),
    description: '重命名',
  },

  // ── Nudge (arrow keys, Shift = 10×) ─────────────────────────────────
  nudge('ArrowLeft', -1, 0, 1),
  nudge('ArrowRight', 1, 0, 1),
  nudge('ArrowUp', 0, -1, 1),
  nudge('ArrowDown', 0, 1, 1),
  nudge('ArrowLeft', -1, 0, 10),
  nudge('ArrowRight', 1, 0, 10),
  nudge('ArrowUp', 0, -1, 10),
  nudge('ArrowDown', 0, 1, 10),

  // ── Clipboard / duplicate ───────────────────────────────────────────
  // copy / cut / paste are async (system clipboard); we void the
  // promise — failure to read/write the OS clipboard falls back to the
  // in-memory clipboard without surfacing an error.
  {
    key: 'c',
    mod: 'cmd',
    when: hasSelection,
    run: (ed) => void ed.copySelection(),
    description: '复制',
  },
  {
    key: 'x',
    mod: 'cmd',
    when: hasSelection,
    run: (ed) => void ed.cutSelection(),
    description: '剪切',
  },
  {
    key: 'v',
    mod: 'cmd',
    run: (ed) => void ed.pasteFromClipboard(),
    description: '粘贴',
  },
  {
    key: 'd',
    mod: 'cmd',
    when: hasSelection,
    run: (ed) => ed.duplicateSelection(),
    description: '复制副本',
  },

  // ── Delete ──────────────────────────────────────────────────────────
  {
    key: 'Delete',
    when: hasSelection,
    run: (ed) => ed.removeWidgets(ed.getSelectedIds()),
    description: '删除选中部件',
  },
  {
    key: 'Backspace',
    when: hasSelection,
    run: (ed) => ed.removeWidgets(ed.getSelectedIds()),
    description: '删除选中部件',
  },

  // ── Layer order ─────────────────────────────────────────────────────
  {
    key: ']',
    mod: 'cmd',
    when: hasSelection,
    run: (ed) => ed.bringForward(ed.getSelectedIds()),
    description: '上移一层',
  },
  {
    key: '[',
    mod: 'cmd',
    when: hasSelection,
    run: (ed) => ed.sendBackward(ed.getSelectedIds()),
    description: '下移一层',
  },
  {
    key: ']',
    mod: 'cmd+alt',
    when: hasSelection,
    run: (ed) => ed.bringToFront(ed.getSelectedIds()),
    description: '置顶',
  },
  {
    key: '[',
    mod: 'cmd+alt',
    when: hasSelection,
    run: (ed) => ed.sendToBack(ed.getSelectedIds()),
    description: '置底',
  },

  // ── Group / ungroup ─────────────────────────────────────────────────
  {
    key: 'g',
    mod: 'cmd',
    when: hasMultiSelection,
    run: (ed) => ed.groupWidgets(ed.getSelectedIds()),
    description: '编组',
  },
  {
    key: 'g',
    mod: 'cmd+shift',
    when: hasSelection,
    run: (ed) => {
      // WidgetNodes track group membership through `groupId` (selection
      // group, not a nested transform tree). Look at the first selected
      // widget and ungroup *its* group. Multi-target ungroup is a UX
      // trap — Figma also only ungroups one at a time.
      const first = ed.getSelectedWidgets()[0]
      if (first?.groupId) ed.ungroupWidgets(first.groupId)
    },
    description: '解组',
  },

  // ── Lock / hide ─────────────────────────────────────────────────────
  {
    key: 'l',
    mod: 'cmd+shift',
    when: hasSelection,
    run: (ed) => ed.toggleLockedOnSelection(),
    description: '锁定 / 解锁',
  },
  {
    key: 'h',
    mod: 'cmd+shift',
    when: hasSelection,
    run: (ed) => ed.toggleHiddenOnSelection(),
    description: '隐藏 / 显示',
  },

  // ── Flip ────────────────────────────────────────────────────────────
  {
    key: 'h',
    mod: 'shift',
    when: hasSelection,
    run: (ed) => ed.flipHorizontal(ed.getSelectedIds()),
    description: '水平翻转',
  },
  {
    key: 'v',
    mod: 'shift',
    when: hasSelection,
    run: (ed) => ed.flipVertical(ed.getSelectedIds()),
    description: '垂直翻转',
  },

  // ── Tool switching ──────────────────────────────────────────────────
  { key: 'v', run: (ed) => ed.setTool('select'), description: '选择工具' },
  { key: 'h', run: (ed) => ed.setTool('pan'), description: '抓手工具' },

  // ── Zoom / view ─────────────────────────────────────────────────────
  {
    key: '0',
    mod: 'cmd',
    run: (ed) => ed.setCamera({ scale: 1, x: 0, y: 0 }),
    description: '缩放到 100%',
  },
  { key: '1', mod: 'cmd', run: (ed) => ed.fitToScreen(), description: '适应屏幕' },
  {
    key: '2',
    mod: 'cmd',
    when: hasSelection,
    run: (ed) => ed.fitToSelection(),
    description: '缩放到选中',
  },
  { key: '=', mod: 'cmd', run: (ed) => ed.zoomAtViewportCenter(0.1), description: '放大' },
  { key: '+', mod: 'cmd', run: (ed) => ed.zoomAtViewportCenter(0.1), description: '放大' },
  { key: '-', mod: 'cmd', run: (ed) => ed.zoomAtViewportCenter(-0.1), description: '缩小' },

  // ── Toggles ─────────────────────────────────────────────────────────
  { key: "'", mod: 'cmd', run: (ed) => ed.toggleView('showGrid'), description: '显示 / 隐藏网格' },
  { key: ';', mod: 'cmd', run: (ed) => ed.toggleView('showGuides'), description: '显示 / 隐藏参考线' },
  {
    key: 'r',
    mod: 'cmd+shift',
    run: (ed) => ed.toggleView('showRulers'),
    description: '显示 / 隐藏标尺',
  },
]
