import * as React from 'react'
import { Plus, Trash2, Variable } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { useDashboardEditor } from '../editor/editor-context'
import {
  setVariableDefs,
  useVariableDefs,
  type ProjectVariable,
  type VariableType,
} from '../variables'

function uid(): string {
  return 'v_' + Math.random().toString(36).slice(2, 9)
}

/**
 * Global-variable manager. Lives in the 画布 tab; opens a dialog to add /
 * edit / remove project variables. Each variable is referenced in a
 * widget's data transform as `$key` and driven by the top filter bar.
 */
export function VariablesEditor() {
  const editor = useDashboardEditor()
  const defs = useVariableDefs()
  const [open, setOpen] = React.useState(false)

  const commit = (next: ProjectVariable[]) => setVariableDefs(editor, next)
  const add = () =>
    commit([
      ...defs,
      {
        id: uid(),
        key: `var${defs.length + 1}`,
        label: `变量 ${defs.length + 1}`,
        type: 'text',
        defaultValue: '',
      },
    ])
  const patch = (i: number, p: Partial<ProjectVariable>) =>
    commit(defs.map((d, idx) => (idx === i ? { ...d, ...p } : d)))
  const remove = (i: number) => commit(defs.filter((_, idx) => idx !== i))

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="text-muted-foreground/80 text-[11px]">
          {defs.length > 0 ? `${defs.length} 个变量` : '尚未定义'}
        </span>
        <div className="flex-1" />
        <Button variant="outline" size="xs" onClick={() => setOpen(true)}>
          <Variable />
          管理变量
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>全局变量</DialogTitle>
            <DialogDescription>
              在组件「数据处理」的筛选值里填 <code>$变量名</code> 即可联动；顶部过滤栏供查看者切换。
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[55vh] space-y-2 overflow-auto py-1">
            {defs.length === 0 && (
              <div className="text-muted-foreground/70 py-4 text-center text-[12px]">
                还没有变量。点「添加变量」创建一个。
              </div>
            )}
            {defs.map((d, i) => (
              <div key={d.id} className="border-border bg-muted/30 space-y-1.5 rounded-md border p-2">
                <div className="flex items-center gap-1.5">
                  <Input
                    value={d.label}
                    placeholder="显示名"
                    onChange={(e) => patch(i, { label: e.target.value })}
                    className="h-7 flex-1 text-[11px]"
                  />
                  <span className="text-muted-foreground/50 text-[11px]">$</span>
                  <Input
                    value={d.key}
                    placeholder="key"
                    onChange={(e) => patch(i, { key: e.target.value.trim() })}
                    className="h-7 w-28 text-[11px]"
                  />
                  <Select
                    value={d.type}
                    onValueChange={(v) => patch(i, { type: v as VariableType })}
                  >
                    <SelectTrigger size="sm" className="h-7 w-20 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select" className="text-[11px]">下拉</SelectItem>
                      <SelectItem value="text" className="text-[11px]">文本</SelectItem>
                      <SelectItem value="number" className="text-[11px]">数字</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(i)}
                    aria-label="删除变量"
                    className="text-muted-foreground/60 hover:text-destructive shrink-0"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground/70 w-12 shrink-0 text-[10px]">默认值</span>
                  <Input
                    value={String(d.defaultValue)}
                    onChange={(e) =>
                      patch(i, {
                        defaultValue: d.type === 'number' ? Number(e.target.value) : e.target.value,
                      })
                    }
                    className="h-7 w-40 text-[11px]"
                  />
                  {d.type === 'select' && (
                    <>
                      <span className="text-muted-foreground/70 shrink-0 text-[10px]">选项</span>
                      <Input
                        value={(d.options ?? []).join(', ')}
                        placeholder="逗号分隔，如 华东, 华北, 华南"
                        onChange={(e) =>
                          patch(i, {
                            options: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        className="h-7 flex-1 text-[11px]"
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="outline" size="sm" onClick={add}>
              <Plus />
              添加变量
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
