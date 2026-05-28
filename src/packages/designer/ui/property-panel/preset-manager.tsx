import * as React from 'react'
import { BookmarkPlus, Trash2 } from 'lucide-react'
import type { WidgetNode } from '@schema/types'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import { useDashboardEditor } from '../../editor/editor-context'
import {
  deletePreset,
  listPresets,
  savePreset,
  type WidgetPreset,
} from '../../presets/widget-presets'

/**
 * Saved-style picker rendered inside the "主题与预设" group. Reads from
 * and writes to localStorage so presets persist per browser.
 *
 *   ┌ 当前样式 → [+ 保存为预设]                          ┐
 *   │ [ 草稿 A   ⋯ apply | trash ]                       │
 *   │ [ 仪表风   ⋯ apply | trash ]                       │
 *
 * On apply we overwrite *only* the saved keys, not the whole props
 * object, so position/data stay put. Saving captures the current props
 * verbatim (minus a name input).
 */
export function PresetManager({ widget }: { widget: WidgetNode }) {
  const editor = useDashboardEditor()
  // Bumped on every save/delete so the listing re-renders without
  // wiring localStorage into a React store.
  const [version, setVersion] = React.useState(0)
  const [draftName, setDraftName] = React.useState('')

  const presets = React.useMemo(
    () => listPresets(widget.type),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [widget.type, version],
  )

  const handleSave = () => {
    const name = draftName.trim() || `预设 ${presets.length + 1}`
    savePreset(widget.type, name, widget.props)
    setDraftName('')
    setVersion((v) => v + 1)
  }

  const handleApply = (preset: WidgetPreset) => {
    // Overwrite only the keys that the preset captured. Untracked
    // props stay put — important when the widget gained new props
    // between when the preset was saved and now.
    editor.updateProps(widget.id, { ...widget.props, ...preset.props })
  }

  const handleDelete = (preset: WidgetPreset) => {
    deletePreset(widget.type, preset.id)
    setVersion((v) => v + 1)
  }

  return (
    <div className="space-y-1.5 px-3 pt-1 pb-2">
      <div
        className={cn(
          'bg-muted hover:bg-muted/80 focus-within:bg-card focus-within:border-primary',
          'flex h-7 min-w-0 items-center gap-1 rounded-sm border border-transparent px-2',
        )}
      >
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
          }}
          placeholder="为当前样式起个名…"
          className="text-foreground placeholder:text-muted-foreground/60 min-w-0 flex-1 border-none bg-transparent text-[11px] outline-none"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleSave}
              aria-label="保存当前样式为预设"
            >
              <BookmarkPlus size={11} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>保存当前样式</TooltipContent>
        </Tooltip>
      </div>

      {presets.length === 0 ? (
        <div className="text-muted-foreground/60 py-1 text-center text-[10px]">
          还没有预设。保存后会出现在这里。
        </div>
      ) : (
        <ul className="space-y-0.5">
          {presets.map((p) => (
            <li
              key={p.id}
              className={cn(
                'group/preset hover:bg-muted/60 flex items-center gap-1.5 rounded-sm px-2 py-1',
              )}
            >
              <button
                type="button"
                onClick={() => handleApply(p)}
                className="text-foreground/85 hover:text-foreground min-w-0 flex-1 cursor-pointer truncate text-left text-[11px]"
                aria-label={`应用预设 ${p.name}`}
              >
                {p.name}
              </button>
              <span className="text-muted-foreground/50 shrink-0 text-[10px]">
                {Object.keys(p.props).length} 项
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    className="text-muted-foreground/60 hover:text-destructive shrink-0 cursor-pointer rounded p-0.5 opacity-0 group-hover/preset:opacity-100"
                    aria-label={`删除预设 ${p.name}`}
                  >
                    <Trash2 size={10} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>删除预设</TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
