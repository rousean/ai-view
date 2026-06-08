import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Check, ChevronDown, FileQuestion, Layers, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import { useDocumentState } from '../../editor/editor-context'
import { selectCurrentPage } from '../../stores/selectors'
import type { SetterProps } from '../setter.interface'

/**
 * Picker for "another widget on the current page". Used by event-action
 * params like `targetWidgetId` (filter, highlight) so the user picks
 * from a list of real widgets instead of typing an opaque id.
 *
 * Two modes via `setterProps.multiple`:
 *   - false (default): value is `string | ''`  — one widget id
 *   - true:            value is `string[]`     — array of ids
 *
 * The dropdown shows every widget on the current page, excluding the
 * widget the user is currently editing (no point in filtering yourself).
 * Selected widgets get a checkmark; clicking a selected entry in multi
 * mode removes it. Single mode closes on selection.
 */
interface WidgetSelectorSetterProps {
  multiple?: boolean
  /** Comma-separator for legacy string-of-ids storage in multi mode. */
  separator?: string
}

export const WidgetSelectorSetter: React.FC<SetterProps<string | string[]>> = ({
  value,
  onChange,
  setterProps,
  context,
  disabled,
}) => {
  const opts = (setterProps ?? {}) as WidgetSelectorSetterProps
  const multiple = opts.multiple === true
  const separator = opts.separator ?? ','
  const currentWidgetId = context?.node?.id

  // Subscribe to the page's widgets array (shallow — only re-renders
  // when the list contents change, not on every layout tick).
  const widgets = useDocumentState(
    useShallow((s) => selectCurrentPage(s)?.widgets ?? []),
  )

  // Normalise the stored value into a string[] for internal logic so
  // single + multi share the same selection-check code.
  const selectedIds = React.useMemo<string[]>(() => {
    if (Array.isArray(value)) return value
    if (typeof value === 'string' && value.length > 0) {
      return multiple ? value.split(separator).map((s) => s.trim()).filter(Boolean) : [value]
    }
    return []
  }, [value, multiple, separator])

  const commit = (next: string[]) => {
    if (multiple) {
      onChange(next as never)
    } else {
      onChange((next[0] ?? '') as never)
    }
  }

  const toggle = (id: string) => {
    if (multiple) {
      const has = selectedIds.includes(id)
      commit(has ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
    } else {
      commit([id])
    }
  }

  // Visible label — different shape depending on selection count.
  const label = (() => {
    if (selectedIds.length === 0) return multiple ? '未选择' : '未选择组件'
    if (!multiple) {
      const w = widgets.find((x) => x.id === selectedIds[0])
      return w?.name ?? `#${selectedIds[0]?.slice(0, 8)}（已删除）`
    }
    if (selectedIds.length === 1) {
      const w = widgets.find((x) => x.id === selectedIds[0])
      return w?.name ?? `#${selectedIds[0]?.slice(0, 8)}`
    }
    return `已选 ${selectedIds.length} 个`
  })()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="xs"
          disabled={disabled}
          className={cn(
            'min-w-0 flex-1 justify-between text-[11px]',
            selectedIds.length === 0 && 'text-muted-foreground font-normal',
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Layers />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="text-muted-foreground/80" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {widgets.length === 0 && (
          <div className="text-muted-foreground/70 px-2 py-2 text-center text-[11px]">
            当前页无可选组件
          </div>
        )}
        {widgets.map((w) => {
          const isSelf = w.id === currentWidgetId
          const isSelected = selectedIds.includes(w.id)
          return (
            <DropdownMenuItem
              key={w.id}
              disabled={isSelf}
              onSelect={(e) => {
                // For multi-select keep menu open
                if (multiple) e.preventDefault()
                toggle(w.id)
              }}
              className="gap-2"
            >
              <Layers />
              <span className="flex-1 truncate">
                {w.name}
                {isSelf && (
                  <span className="text-muted-foreground/60 ml-1 text-[10px]">（自身）</span>
                )}
              </span>
              <span className="text-muted-foreground/50 font-mono text-[9px]">
                {w.id.slice(0, 6)}
              </span>
              {isSelected && <Check size={12} className="text-primary" />}
            </DropdownMenuItem>
          )
        })}
        {multiple && selectedIds.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem onSelect={() => commit([])} className="gap-2">
                  <X />
                  清空选择
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent side="left">取消所有已选组件</TooltipContent>
            </Tooltip>
          </>
        )}
        {/* Render a hint row if the stored value contains ids that don't
            exist on the page anymore — surface the dangling reference
            instead of silently dropping it. */}
        {selectedIds.some((id) => !widgets.find((w) => w.id === id)) && (
          <>
            <DropdownMenuSeparator />
            <div className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5 px-2 py-1 text-[10px]">
              <FileQuestion size={11} />
              <span>引用了已删除的组件</span>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
