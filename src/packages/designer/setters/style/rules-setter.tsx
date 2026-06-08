import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { ConditionalRule } from '@widgets/shared/conditional'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { ColorSetter } from './color-setter'
import type { SetterProps } from '../setter.interface'

const OPS = [
  { value: 'gt', label: '大于 >' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '小于 <' },
  { value: 'lte', label: '≤' },
  { value: 'eq', label: '等于 =' },
  { value: 'between', label: '区间' },
]

function uid(): string {
  return 'r_' + Math.random().toString(36).slice(2, 9)
}

/**
 * Edits a `ConditionalRule[]` — each rule is op + threshold(s) + colour.
 * Rules apply top-to-bottom (first match wins). Used by widgets that want
 * threshold colouring (number card today; gauge/table can opt in).
 */
export const RulesSetter: React.FC<SetterProps<ConditionalRule[]>> = ({ value, onChange }) => {
  const rules = Array.isArray(value) ? value : []
  const commit = (next: ConditionalRule[]) => onChange(next)
  const add = () =>
    commit([...rules, { id: uid(), op: 'gt', value: 0, color: '#F24822' }])
  const patch = (i: number, p: Partial<ConditionalRule>) =>
    commit(rules.map((r, idx) => (idx === i ? { ...r, ...p } : r)))
  const remove = (i: number) => commit(rules.filter((_, idx) => idx !== i))

  return (
    <div className="w-full space-y-1.5">
      {rules.length === 0 && (
        <div className="text-muted-foreground/70 text-[11px]">
          按数值给数字上色（自上而下，命中即停）。
        </div>
      )}
      {rules.map((r, i) => (
        <div key={r.id} className="border-border bg-background space-y-1 rounded-md border p-1.5">
          <div className="flex items-center gap-1">
            <Select value={r.op} onValueChange={(v) => patch(i, { op: v as ConditionalRule['op'] })}>
              <SelectTrigger
                size="sm"
                className="bg-muted h-6 w-[72px] shrink-0 border-transparent px-1.5 text-[11px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-[11px]">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={String(r.value)}
              onChange={(e) => patch(i, { value: Number(e.target.value) })}
              className="bg-muted h-6 min-w-0 flex-1 border-transparent px-1.5 text-[11px]"
            />
            {r.op === 'between' && (
              <>
                <span className="text-muted-foreground/60 shrink-0 text-[10px]">~</span>
                <Input
                  type="number"
                  value={String(r.value2 ?? 0)}
                  onChange={(e) => patch(i, { value2: Number(e.target.value) })}
                  className="bg-muted h-6 min-w-0 flex-1 border-transparent px-1.5 text-[11px]"
                />
              </>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="删除规则"
              className="text-muted-foreground/60 hover:text-destructive shrink-0 cursor-pointer"
            >
              <Trash2 size={12} />
            </button>
          </div>
          <ColorSetter value={r.color} onChange={(c) => patch(i, { color: c as string })} />
        </div>
      ))}
      <Button variant="outline" size="xs" className="w-full" onClick={add}>
        <Plus />
        添加规则
      </Button>
    </div>
  )
}
