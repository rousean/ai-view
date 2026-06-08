import * as React from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, Filter, ListFilter, Plus, Sigma, Trash2, X } from 'lucide-react'
import type { DataSource, FieldDef, TransformStep, WidgetNode } from '@schema/types'
import type { WidgetMeta } from '@widgets/widget-meta'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { cn } from '~/lib/utils'
import { PropSection } from '../property-controls'
import { useDashboardEditor } from '../../editor/editor-context'

interface MeasureSpec {
  field?: string
  op?: string
  as?: string
}

const TYPE_LABEL: Record<string, string> = {
  filter: '筛选',
  sort: '排序',
  aggregate: '聚合',
  limit: '限制行数',
}

const FILTER_OPS = [
  { value: 'eq', label: '等于' },
  { value: 'ne', label: '不等于' },
  { value: 'gt', label: '大于' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '小于' },
  { value: 'lte', label: '≤' },
  { value: 'contains', label: '包含' },
]
const AGG_OPS = [
  { value: 'sum', label: '求和' },
  { value: 'avg', label: '平均' },
  { value: 'count', label: '计数' },
  { value: 'max', label: '最大' },
  { value: 'min', label: '最小' },
]

function uid(): string {
  return 'tf_' + Math.random().toString(36).slice(2, 9)
}

function defaultParams(type: string): Record<string, unknown> {
  switch (type) {
    case 'filter':
      return { field: '', op: 'eq', value: '' }
    case 'sort':
      return { field: '', order: 'asc' }
    case 'aggregate':
      return { groupBy: '', measures: [{ field: '', op: 'sum' }] }
    case 'limit':
      return { count: 10, offset: 0 }
    default:
      return {}
  }
}

/** Compact dropdown built on shadcn Select, sized for the property panel. */
function MiniSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  className?: string
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger
        size="sm"
        className={cn('bg-muted h-6 min-w-0 border-transparent px-1.5 text-[11px]', className)}
      >
        <SelectValue placeholder={placeholder ?? '选择'} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-[11px]">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const iconBtn =
  'text-muted-foreground/60 hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground/60 shrink-0 cursor-pointer'

/**
 * 数据处理 — author-side data pipeline editor. Each step (filter / sort /
 * aggregate / limit) is a small card; steps run top-to-bottom (executed by
 * `@renderer/transforms` inside the resolver). Writes the whole array back
 * via `editor.setWidgetTransform`.
 */
export function TransformSection({
  widget,
  meta,
  dataSources,
}: {
  widget: WidgetNode
  meta: WidgetMeta | undefined
  dataSources: DataSource[]
}) {
  const editor = useDashboardEditor()
  const steps = widget.data?.transform ?? []

  // Columns available to reference, mirroring SlotMappingPanel.
  const fields: FieldDef[] = React.useMemo(() => {
    if (widget.data?.mode === 'inline') return widget.data.dataset.fields
    if (widget.data?.mode === 'bound') {
      const sourceId = widget.data.sourceId
      return dataSources.find((s) => s.id === sourceId)?.schema?.fields ?? []
    }
    return meta?.dataSchema?.sample.fields ?? []
  }, [widget.data, meta, dataSources])
  const fieldOpts = fields.map((f) => ({ value: f.name, label: f.name }))

  const commit = (next: TransformStep[]) => editor.setWidgetTransform(widget.id, next)
  const addStep = (type: string) =>
    commit([...steps, { id: uid(), type, enabled: true, params: defaultParams(type) }])
  const patchStep = (i: number, patch: Partial<TransformStep>) =>
    commit(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  const patchParams = (i: number, patch: Record<string, unknown>) =>
    patchStep(i, { params: { ...steps[i].params, ...patch } })
  const removeStep = (i: number) => commit(steps.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= steps.length) return
    const next = [...steps]
    const [s] = next.splice(i, 1)
    next.splice(j, 0, s)
    commit(next)
  }

  return (
    <PropSection title="数据处理" defaultOpen={false}>
      <div className="space-y-1.5 px-3 py-2">
        {steps.length === 0 && (
          <div className="text-muted-foreground/70 text-[11px]">
            对数据做筛选 / 排序 / 聚合 / 限制行数，按顺序执行。
          </div>
        )}

        {steps.map((step, i) => (
          <div
            key={step.id}
            className={cn(
              'border-border bg-background rounded-md border p-1.5',
              !step.enabled && 'opacity-50',
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium">{TYPE_LABEL[step.type] ?? step.type}</span>
              <span className="text-muted-foreground/40 text-[10px]">#{i + 1}</span>
              <div className="flex-1" />
              <button
                type="button"
                className={iconBtn}
                disabled={i === 0}
                onClick={() => move(i, -1)}
                aria-label="上移"
              >
                <ArrowUp size={12} />
              </button>
              <button
                type="button"
                className={iconBtn}
                disabled={i === steps.length - 1}
                onClick={() => move(i, 1)}
                aria-label="下移"
              >
                <ArrowDown size={12} />
              </button>
              <button
                type="button"
                className={iconBtn}
                onClick={() => patchStep(i, { enabled: !step.enabled })}
                aria-label={step.enabled ? '停用' : '启用'}
              >
                {step.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
              <button
                type="button"
                className={cn(iconBtn, 'hover:text-destructive')}
                onClick={() => removeStep(i)}
                aria-label="删除"
              >
                <Trash2 size={12} />
              </button>
            </div>

            <div className="mt-1.5">
              <StepBody step={step} fieldOpts={fieldOpts} onParams={(p) => patchParams(i, p)} />
            </div>
          </div>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="xs" className="w-full">
              <Plus />
              添加处理步骤
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem onSelect={() => addStep('filter')}>
              <Filter />
              筛选
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => addStep('sort')}>
              <ListFilter />
              排序
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => addStep('aggregate')}>
              <Sigma />
              聚合
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => addStep('limit')}>
              <ListFilter />
              限制行数
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </PropSection>
  )
}

function StepBody({
  step,
  fieldOpts,
  onParams,
}: {
  step: TransformStep
  fieldOpts: Array<{ value: string; label: string }>
  onParams: (patch: Record<string, unknown>) => void
}) {
  const p = step.params

  if (step.type === 'filter') {
    return (
      <div className="space-y-1">
        <div className="flex gap-1">
          <MiniSelect
            value={String(p.field ?? '')}
            onChange={(v) => onParams({ field: v })}
            options={fieldOpts}
            placeholder="列"
            className="flex-1"
          />
          <MiniSelect
            value={String(p.op ?? 'eq')}
            onChange={(v) => onParams({ op: v })}
            options={FILTER_OPS}
            className="w-20 shrink-0"
          />
        </div>
        <Input
          value={String(p.value ?? '')}
          onChange={(e) => onParams({ value: e.target.value })}
          placeholder="值"
          className="bg-muted h-6 border-transparent px-1.5 text-[11px]"
        />
      </div>
    )
  }

  if (step.type === 'sort') {
    return (
      <div className="flex gap-1">
        <MiniSelect
          value={String(p.field ?? '')}
          onChange={(v) => onParams({ field: v })}
          options={fieldOpts}
          placeholder="列"
          className="flex-1"
        />
        <MiniSelect
          value={String(p.order ?? 'asc')}
          onChange={(v) => onParams({ order: v })}
          options={[
            { value: 'asc', label: '升序' },
            { value: 'desc', label: '降序' },
          ]}
          className="w-20 shrink-0"
        />
      </div>
    )
  }

  if (step.type === 'limit') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground/70 text-[10px]">取</span>
        <Input
          type="number"
          value={String(p.count ?? 0)}
          onChange={(e) => onParams({ count: Number(e.target.value) })}
          className="bg-muted h-6 w-16 border-transparent px-1.5 text-[11px]"
        />
        <span className="text-muted-foreground/70 text-[10px]">行 · 跳过</span>
        <Input
          type="number"
          value={String(p.offset ?? 0)}
          onChange={(e) => onParams({ offset: Number(e.target.value) })}
          className="bg-muted h-6 w-16 border-transparent px-1.5 text-[11px]"
        />
      </div>
    )
  }

  if (step.type === 'aggregate') {
    const measures: MeasureSpec[] = Array.isArray(p.measures) ? (p.measures as MeasureSpec[]) : []
    const setMeasures = (m: MeasureSpec[]) => onParams({ measures: m })
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground/70 w-8 shrink-0 text-[10px]">分组</span>
          <MiniSelect
            value={String(p.groupBy ?? '')}
            onChange={(v) => onParams({ groupBy: v })}
            options={fieldOpts}
            placeholder="分组列"
            className="flex-1"
          />
        </div>
        {measures.map((m, mi) => (
          <div key={mi} className="flex items-center gap-1">
            <span className="text-muted-foreground/70 w-8 shrink-0 text-[10px]">
              {mi === 0 ? '度量' : ''}
            </span>
            <MiniSelect
              value={m.field ?? ''}
              onChange={(v) => setMeasures(measures.map((x, j) => (j === mi ? { ...x, field: v } : x)))}
              options={fieldOpts}
              placeholder="列"
              className="flex-1"
            />
            <MiniSelect
              value={m.op ?? 'sum'}
              onChange={(v) => setMeasures(measures.map((x, j) => (j === mi ? { ...x, op: v } : x)))}
              options={AGG_OPS}
              className="w-16 shrink-0"
            />
            {measures.length > 1 && (
              <button
                type="button"
                className={cn(iconBtn, 'hover:text-destructive')}
                onClick={() => setMeasures(measures.filter((_, j) => j !== mi))}
                aria-label="删除度量"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-primary cursor-pointer text-[10px] hover:underline"
          onClick={() => setMeasures([...measures, { field: '', op: 'sum' }])}
        >
          + 添加度量
        </button>
      </div>
    )
  }

  return null
}
