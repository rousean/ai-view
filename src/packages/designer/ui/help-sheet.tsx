import * as React from 'react'
import { Keyboard } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import { DEFAULT_SHORTCUTS, type ShortcutDef } from '../editor/keyboard-shortcuts'

/**
 * Help / Cheatsheet sheet — surfaces every keyboard shortcut that
 * ships with the editor. Opens via the `?` key (without any modifier)
 * or the dedicated button in the TopBar.
 *
 * Groups are derived from the section comments in
 * keyboard-shortcuts.ts — we approximate them by matching the
 * description's leading keyword. Cheap, no schema change.
 */
export function HelpSheet() {
  const [open, setOpen] = React.useState(false)

  // `?` key opens the sheet. Skip when typing in an input so the
  // shortcut never steals a literal question-mark.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.shiftKey === false) return // ? is shift+/
      const t = e.target as HTMLElement | null
      if (!t) return
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return
      e.preventDefault()
      setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const groups = React.useMemo(() => groupShortcuts(DEFAULT_SHORTCUTS), [])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Don't wrap the Button in `SheetTrigger asChild` AND
          `TooltipTrigger asChild` at the same time — Radix's two
          triggers fight over the click handler and the visible button
          ends up doing neither. Drive the sheet open ourselves via
          onClick and keep the Tooltip cleanly scoped to the Button. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="帮助"
            onClick={() => setOpen(true)}
          >
            <Keyboard size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>快捷键 · ?</TooltipContent>
      </Tooltip>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Keyboard size={16} />
            快捷键
          </SheetTitle>
          <SheetDescription>
            按 <KeyKbd>?</KeyKbd> 随时调出此面板。任何 <KeyKbd>⌘</KeyKbd> 在 Windows
            上等同于 <KeyKbd>Ctrl</KeyKbd>。
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 overflow-y-auto px-4 pb-6">
          {groups.map((g) => (
            <section key={g.title}>
              <h3 className="text-muted-foreground/80 mb-1 text-[11px] font-semibold tracking-wide uppercase">
                {g.title}
              </h3>
              <ul className="border-border/60 divide-border/40 divide-y overflow-hidden rounded-md border">
                {g.items.map((s, i) => (
                  <li
                    key={i}
                    className="hover:bg-muted/40 flex items-center justify-between gap-2 px-3 py-1.5"
                  >
                    <span className="text-foreground/85 truncate text-[12px]">
                      {s.description}
                    </span>
                    <ShortcutHint shortcut={s} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Group + render helpers ───────────────────────────────────────

interface ShortcutGroup {
  title: string
  items: ShortcutDef[]
}

function groupShortcuts(list: ShortcutDef[]): ShortcutGroup[] {
  // Heuristic — map a description's first word to a group label.
  // Hand-tuned to match the section comments in the shortcut source.
  const labelFor = (s: ShortcutDef): string => {
    const d = s.description
    if (/撤销|重做|保存/.test(d)) return '历史 & 保存'
    if (/选择|全选|重命名|取消选择/.test(d)) return '选择'
    if (/复制|剪切|粘贴|删除/.test(d)) return '编辑'
    if (/移动|向/.test(d)) return '键盘微调'
    if (/上移|下移|置顶|置底/.test(d)) return '图层顺序'
    if (/编组|解组|锁定|隐藏|翻转/.test(d)) return '组与状态'
    if (/工具|缩放|适应|网格|参考线|标尺/.test(d)) return '画布 & 视图'
    return '其它'
  }
  const map = new Map<string, ShortcutDef[]>()
  for (const s of list) {
    const k = labelFor(s)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(s)
  }
  // Preferred display order.
  const ORDER = [
    '历史 & 保存',
    '选择',
    '编辑',
    '键盘微调',
    '图层顺序',
    '组与状态',
    '画布 & 视图',
    '其它',
  ]
  return ORDER.filter((t) => map.has(t)).map((t) => ({ title: t, items: map.get(t)! }))
}

function ShortcutHint({ shortcut }: { shortcut: ShortcutDef }) {
  // Format modifiers as glyphs — universally readable + matches what
  // macOS shows in menus.
  const mods = (shortcut.mod ?? '').split('+').filter(Boolean)
  const keys: string[] = []
  if (mods.includes('cmd')) keys.push('⌘')
  if (mods.includes('shift')) keys.push('⇧')
  if (mods.includes('alt')) keys.push('⌥')
  keys.push(prettyKey(shortcut.key))
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {keys.map((k, i) => (
        <KeyKbd key={i}>{k}</KeyKbd>
      ))}
    </span>
  )
}

function prettyKey(k: string): string {
  const map: Record<string, string> = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Escape: 'Esc',
    Delete: 'Del',
    Backspace: '⌫',
    Tab: '⇥',
    Enter: '↵',
  }
  return map[k] ?? k.toUpperCase()
}

function KeyKbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        'bg-muted text-foreground/85 border-border/60 inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-mono text-[10px] font-medium',
      )}
    >
      {children}
    </kbd>
  )
}
