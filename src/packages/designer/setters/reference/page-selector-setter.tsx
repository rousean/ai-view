import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ChevronDown, FileQuestion, Layout } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { cn } from '~/lib/utils'
import { useDocumentState } from '../../editor/editor-context'
import type { SetterProps } from '../setter.interface'

/**
 * Picker for "another page in this project". Used by the `navigatePage`
 * action so users pick a real page entry instead of typing a page id.
 *
 * Always single-select — interactions navigate to one page at a time.
 */
export const PageSelectorSetter: React.FC<SetterProps<string>> = ({
  value,
  onChange,
  disabled,
}) => {
  const pages = useDocumentState(useShallow((s) => s.project?.pages ?? []))
  const currentPageId = useDocumentState((s) => s.project?.currentPageId)

  const selected = pages.find((p) => p.id === value)
  const dangling = !!value && !selected

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="xs"
          disabled={disabled}
          className={cn(
            'min-w-0 flex-1 justify-between text-[11px]',
            !value && 'text-muted-foreground font-normal',
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Layout />
            <span className="truncate">
              {selected?.name ?? (dangling ? `#${value.slice(0, 8)}（已删除）` : '未选择页面')}
            </span>
          </span>
          <ChevronDown className="text-muted-foreground/80" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {pages.length === 0 && (
          <div className="text-muted-foreground/70 px-2 py-2 text-center text-[11px]">
            项目无可选页面
          </div>
        )}
        {pages.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onSelect={() => onChange(p.id)}
            className="gap-2"
          >
            <Layout />
            <span className="flex-1 truncate">{p.name}</span>
            {p.id === currentPageId && (
              <span className="text-muted-foreground/60 text-[10px]">当前</span>
            )}
          </DropdownMenuItem>
        ))}
        {dangling && (
          <div className="text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1.5 border-t border-border/60 px-2 py-1 text-[10px]">
            <FileQuestion size={11} />
            <span>页面已被删除</span>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
