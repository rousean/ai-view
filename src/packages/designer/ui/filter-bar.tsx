import * as React from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import type { ProjectVariable } from '../variables'
import { useVariableStore } from '../variables'

/**
 * Top filter bar — one control per global variable. Picking a value writes
 * to the runtime variable store; widgets that reference `$key` in a data
 * transform re-resolve. "Pick once, many widgets react."
 *
 * Takes `defs` as a prop so it works both in the editor (defs from the
 * document store) and the standalone runtime (defs from the loaded
 * project) — only the current-values store is shared/global.
 */
export function FilterBar({ defs }: { defs: ProjectVariable[] }) {
  const overrides = useVariableStore((s) => s.values)
  const setValue = useVariableStore((s) => s.actions.setValue)

  if (!defs || defs.length === 0) return null

  return (
    <div className="border-border bg-card/90 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-b px-3 py-1.5 backdrop-blur-sm">
      <SlidersHorizontal size={13} className="text-muted-foreground/70 shrink-0" />
      {defs.map((d) => {
        const val = overrides[d.key] ?? d.defaultValue
        return (
          <label key={d.id} className="flex items-center gap-1.5 text-[11px]">
            <span className="text-muted-foreground/80 whitespace-nowrap">{d.label}</span>
            {d.type === 'select' ? (
              <Select value={String(val)} onValueChange={(v) => setValue(d.key, v)}>
                <SelectTrigger size="sm" className="h-6 min-w-[88px] text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(d.options ?? []).map((o) => (
                    <SelectItem key={o} value={o} className="text-[11px]">
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={d.type === 'number' ? 'number' : 'text'}
                value={String(val)}
                onChange={(e) =>
                  setValue(d.key, d.type === 'number' ? Number(e.target.value) : e.target.value)
                }
                className="h-6 w-28 text-[11px]"
              />
            )}
          </label>
        )
      })}
    </div>
  )
}
