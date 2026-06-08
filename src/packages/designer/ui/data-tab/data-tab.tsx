import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  ChartBar,
  ChevronDown,
  ClipboardPaste,
  Database,
  FileSpreadsheet,
  FileText,
  Globe,
  Info,
  Pencil,
  Radio,
  X,
} from 'lucide-react'
import type { DataSlotDef, WidgetMeta } from '@widgets/widget-meta'
import type { DataSource, WidgetData, WidgetNode } from '@schema/types'
import {
  autoMapToSlots,
  initInlineFromSample,
  parseCsv,
  resolveWidgetData,
} from '@designer/data'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { toast } from '~/components/ui/sonner'
import { cn } from '~/lib/utils'
import { PropRow, PropSection, Segmented } from '../property-controls'
import { useDashboardEditor, useDocumentState, useEditorState } from '../../editor/editor-context'
import { selectWidget } from '../../stores/selectors'
import { createDataSource, DataSourceEditor } from '../data-sources-panel'
import { DatasetTableEditor } from './dataset-table-editor'
import { TransformSection } from './transform-section'

/**
 * 数据 tab — the dedicated home for everything data-related on the
 * selected widget. Layout matches DataV / Looker conventions:
 *
 *   1. Mode picker         — 内联 / 数据源 segmented control
 *   2. Slot mapping        — one row per declared slot, dropdown of
 *                            available columns (slot ← column)
 *   3. Body                — inline: typed table editor;
 *                            bound:  source picker + readonly preview
 *   4. Preview             — first N resolved rows so the user can see
 *                            exactly what the chart receives
 *
 * Multi-select / no-select / widgets without `dataSchema.slots` get
 * placeholder copy explaining why this tab is inert.
 */
export function DataTab() {
  const editor = useDashboardEditor()
  const selectedIds = useEditorState((s) => s.selectedIds)
  const primaryId = useEditorState((s) => s.primarySelectionId)
  const widget = useDocumentState((s) =>
    primaryId ? (selectWidget(primaryId)(s) ?? null) : null,
  )
  const dataSources = useDocumentState(
    useShallow((s) => s.project?.dataSources ?? []),
  )

  // Session cache of inline datasets, keyed by widget id. Without it,
  // flipping 内联 → 数据源 → 内联 destroys the hand-entered table: the
  // first switch overwrites `widget.data` with a bound spec, and the
  // switch back re-seeds from the meta sample. The cache lets the user
  // round-trip without losing their edits. Not persisted (a reloaded
  // bound widget has no inline to restore) — purely an edit-session aid.
  const inlineCacheRef = React.useRef(new Map<string, WidgetData>())

  if (selectedIds.length === 0) {
    return (
      <EmptyState
        icon={ChartBar}
        title="未选中组件"
        hint="在画布中点击组件以编辑数据"
      />
    )
  }
  if (selectedIds.length > 1) {
    return (
      <EmptyState
        icon={ChartBar}
        title="多选不支持编辑数据"
        hint="选择单个组件以查看其数据"
      />
    )
  }
  if (!widget) return null

  const meta = editor.registry.widgets.get(widget.type) as WidgetMeta | undefined
  const slots = meta?.dataSchema?.slots
  if (!slots || slots.length === 0) {
    return (
      <EmptyState
        icon={Info}
        title="该组件无数据需求"
        hint={`${meta?.title ?? widget.type} 不消费外部数据`}
      />
    )
  }

  // Mode is derived from node.data — "sample" is a virtual mode
  // representing "no user data yet, falling back to widget meta sample".
  // First edit promotes sample → inline (via ensureInlineWidgetData).
  const mode: 'inline' | 'bound' | 'sample' = widget.data?.mode ?? 'sample'

  const handleModeChange = (next: 'inline' | 'bound') => {
    if (next === mode) return
    if (next === 'inline') {
      // Restore the cached inline dataset if the user previously edited
      // one this session; otherwise seed a fresh table from the sample.
      const cached = inlineCacheRef.current.get(widget.id)
      const init = cached ?? initInlineFromSample(meta)
      if (init) editor.setWidgetData(widget.id, init)
    } else {
      // Cache the current inline dataset before it's overwritten by the
      // bound spec, so switching back doesn't drop the user's edits.
      if (widget.data?.mode === 'inline') {
        inlineCacheRef.current.set(widget.id, widget.data)
      }
      // Switching to bound with no source picked yet — set bound with
      // empty sourceId so the source picker appears. (`mapping: {}`
      // because no source means no columns to map.)
      editor.setWidgetData(widget.id, {
        mode: 'bound',
        sourceId: '',
        mapping: {},
      })
    }
  }

  return (
    <>
      {/* Mode picker — keep "示例" as a third grey-out so users see why
          they're rendering sample data even before they pick a mode. */}
      <PropSection title="数据来源">
        <PropRow label="模式">
          <Segmented
            value={mode === 'sample' ? 'inline' : mode}
            onChange={(m) => handleModeChange(m as 'inline' | 'bound')}
            options={[
              { value: 'inline', label: '内联' },
              { value: 'bound', label: '数据源' },
            ]}
          />
        </PropRow>
        {mode === 'sample' && (
          <PropRow label="提示">
            <span className="text-muted-foreground/80 text-[11px]">
              当前显示示例数据。开始编辑或绑定即生效。
            </span>
          </PropRow>
        )}
      </PropSection>

      {/* Bound mode — source picker */}
      {mode === 'bound' && (
        <SourcePicker
          widgetId={widget.id}
          currentSourceId={widget.data?.mode === 'bound' ? widget.data.sourceId : ''}
          sources={dataSources}
          slots={slots}
        />
      )}

      {/* Slot mapping — shown for inline (against inline columns) and
          for bound when a source is picked (against source columns). */}
      <SlotMappingPanel
        widget={widget}
        meta={meta}
        slots={slots}
        dataSources={dataSources}
      />

      {/* Inline data — edit in a roomy dialog (the 300px panel is too
          cramped for a table) + one-click paste from Excel / CSV. */}
      {mode !== 'bound' && <InlineDataSection widget={widget} meta={meta} slots={slots} />}

      {/* Author data pipeline — filter / sort / aggregate / limit, run by
          the resolver before slot projection. */}
      <TransformSection widget={widget} meta={meta} dataSources={dataSources} />

      {/* Resolved preview — what the component actually receives.
          Always shown so users can sanity-check their mapping. */}
      <PreviewPane widget={widget} meta={meta} dataSources={dataSources} />
    </>
  )
}

// ─── Empty state ──────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  hint: string
}) {
  return (
    <div className="text-muted-foreground/80 p-6 text-center">
      <Icon size={28} className="text-muted-foreground/40 mx-auto" />
      <div className="mt-2.5 text-[13px]">{title}</div>
      <div className="text-muted-foreground/60 mt-1 text-[11px]">{hint}</div>
    </div>
  )
}

// ─── Source picker (bound mode) ────────────────────────────────────

function SourcePicker({
  widgetId,
  currentSourceId,
  sources,
  slots,
}: {
  widgetId: string
  currentSourceId: string
  sources: DataSource[]
  slots: DataSlotDef[]
}) {
  const editor = useDashboardEditor()
  const current = sources.find((s) => s.id === currentSourceId)
  const [editingSource, setEditingSource] = React.useState<DataSource | null>(null)

  const handleCreate = (type: 'api' | 'ws' | 'csv' | 'json' | 'static') => {
    const src = createDataSource(editor, sources.length, type)
    editor.setBoundSource(widgetId, src.id, {})
    setEditingSource(src)
  }

  const pickSource = (id: string) => {
    const src = sources.find((s) => s.id === id)
    if (!src) return
    // Auto-map source fields → slots so the user sees a working chart
    // immediately. They can refine in the mapping panel.
    const fields = src.schema?.fields ?? []
    const mapping = autoMapToSlots(fields, slots)
    editor.setBoundSource(widgetId, id, mapping)
  }

  return (
    <PropSection title="数据源">
      <PropRow label="选择">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="xs"
              className={cn(
                'min-w-0 flex-1 justify-between text-[11px]',
                !current && 'text-muted-foreground font-normal',
              )}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <Database />
                <span className="truncate">{current?.name ?? '未选择'}</span>
              </span>
              <ChevronDown className="text-muted-foreground/80" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {sources.length === 0 ? (
              <div className="text-muted-foreground/80 px-2 py-3 text-center text-[11px]">
                还没有数据源
              </div>
            ) : (
              sources.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onSelect={() => pickSource(s.id)}
                  disabled={s.id === currentSourceId}
                >
                  <Database />
                  <span className="flex-1 truncate">{s.name}</span>
                  {s.id === currentSourceId && (
                    <span className="text-muted-foreground/60 text-[10px]">当前</span>
                  )}
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => handleCreate('api')}>
              <Globe />
              新建 · HTTP API
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleCreate('ws')}>
              <Radio />
              新建 · WebSocket 实时
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleCreate('csv')}>
              <FileSpreadsheet />
              新建 · CSV / TSV
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleCreate('json')}>
              <FileText />
              新建 · JSON
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleCreate('static')}>
              <Database />
              新建 · 静态
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PropRow>
      {!current && currentSourceId && (
        <PropRow label="状态">
          <span className="text-amber-500 text-[11px]">数据源已被删除</span>
        </PropRow>
      )}
      {editingSource && (
        <DataSourceEditor source={editingSource} onClose={() => setEditingSource(null)} />
      )}
    </PropSection>
  )
}

// ─── Slot mapping panel ────────────────────────────────────────────

const ROLE_LABEL: Record<DataSlotDef['role'], string> = {
  dimension: '维度',
  measure: '度量',
  attribute: '属性',
}
const ROLE_COLOR: Record<DataSlotDef['role'], string> = {
  dimension: 'text-sky-500',
  measure: 'text-emerald-500',
  attribute: 'text-amber-500',
}

function SlotMappingPanel({
  widget,
  meta,
  slots,
  dataSources,
}: {
  widget: WidgetNode
  meta: WidgetMeta | undefined
  slots: DataSlotDef[]
  dataSources: DataSource[]
}) {
  const editor = useDashboardEditor()
  // Available columns depend on the data mode:
  //   - inline: the inline dataset's fields
  //   - bound:  the source's declared schema (empty when no source or
  //             the source has no schema declared yet)
  //   - sample: the meta's sample-dataset fields
  const availableFields = React.useMemo(() => {
    if (widget.data?.mode === 'inline') return widget.data.dataset.fields
    if (widget.data?.mode === 'bound') {
      // Re-narrow inside the find callback — `widget.data` is checked
      // above but TS can't carry the narrowing into the closure.
      const sourceId = widget.data.sourceId
      const src = dataSources.find((s) => s.id === sourceId)
      return src?.schema?.fields ?? []
    }
    return meta?.dataSchema?.sample.fields ?? []
  }, [widget.data, meta, dataSources])

  // For sample mode the mapping isn't stored on the node — derive an
  // auto-map so the dropdowns still show meaningful state.
  const mapping = widget.data?.mapping ?? autoMapToSlots(availableFields, slots)

  // Don't even render the section if there's nothing to map against
  // (bound mode with no source picked yet).
  if (availableFields.length === 0) {
    if (widget.data?.mode === 'bound') {
      return (
        <PropSection title="字段映射">
          <div className="text-muted-foreground/80 px-3 py-2 text-[11px]">
            请先选择数据源
          </div>
        </PropSection>
      )
    }
    return null
  }

  const handleChange = (slotName: string, columnName: string | null) => {
    // sample mode: bootstrap to inline before recording a mapping.
    if (!widget.data) editor.ensureInlineWidgetData(widget.id)
    editor.updateSlotMapping(widget.id, { [slotName]: columnName })
  }

  return (
    <PropSection title="字段映射">
      {slots.map((slot) => {
        const value = mapping[slot.name]
        const single = Array.isArray(value) ? value[0] : value
        return (
          <PropRow key={slot.name} label={slot.label}>
            <span className={cn('shrink-0 text-[10px]', ROLE_COLOR[slot.role])}>
              {ROLE_LABEL[slot.role]}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="xs"
                  className={cn(
                    'min-w-0 flex-1 justify-between text-[11px]',
                    !single && 'text-muted-foreground font-normal',
                  )}
                >
                  <span className="min-w-0 truncate">
                    {single || (slot.optional ? '可选 · 未映射' : '未映射')}
                  </span>
                  <ChevronDown className="text-muted-foreground/80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {availableFields
                  .filter((f) => slot.accepts.includes(f.type))
                  .map((f) => (
                    <DropdownMenuItem
                      key={f.name}
                      disabled={f.name === single}
                      onSelect={() => handleChange(slot.name, f.name)}
                    >
                      <FileSpreadsheet />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-muted-foreground/60 text-[10px]">
                        {f.type}
                      </span>
                    </DropdownMenuItem>
                  ))}
                {availableFields.filter((f) => slot.accepts.includes(f.type)).length === 0 && (
                  <div className="text-muted-foreground/80 px-2 py-1.5 text-[11px]">
                    没有可用列（需要 {slot.accepts.join(' / ')}）
                  </div>
                )}
                {single && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => handleChange(slot.name, null)}>
                      <X />
                      取消映射
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </PropRow>
        )
      })}
    </PropSection>
  )
}

// ─── Preview pane ─────────────────────────────────────────────────

const PREVIEW_INITIAL_LIMIT = 5
/** Hard cap when the user expands — large datasets stay scrollable but
 *  we never render more than this many DOM rows at once. */
const PREVIEW_MAX_ROWS = 200

function PreviewPane({
  widget,
  meta,
  dataSources,
}: {
  widget: WidgetNode
  meta: WidgetMeta | undefined
  dataSources: DataSource[]
}) {
  const resolved = React.useMemo(() => {
    const map: Record<string, DataSource> = {}
    for (const s of dataSources) map[s.id] = s
    return resolveWidgetData(widget, meta, map)
  }, [widget, meta, dataSources])

  const total = resolved.rows.length
  const [expanded, setExpanded] = React.useState(false)
  const visible = expanded ? Math.min(total, PREVIEW_MAX_ROWS) : PREVIEW_INITIAL_LIMIT
  const previewRows = resolved.rows.slice(0, visible)

  return (
    <PropSection title={`数据预览 · ${total} 行`} defaultOpen={false}>
      <div className="px-3 pt-1 pb-2">
        {resolved.isSample && (
          <div className="text-muted-foreground/80 mb-1.5 text-[10px]">
            ● 渲染示例数据
          </div>
        )}
        {resolved.fields.length === 0 ? (
          <div className="text-muted-foreground/60 py-3 text-center text-[11px]">
            没有可预览的数据
          </div>
        ) : (
          <div
            className={cn(
              'border-border bg-background overflow-hidden rounded-md border',
              expanded && 'max-h-[240px] overflow-y-auto',
            )}
          >
            <Table className="text-[11px] tabular-nums">
              <TableHeader className="bg-muted/40 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent">
                  {resolved.fields.map((f) => (
                    <TableHead
                      key={f.name}
                      className="text-muted-foreground/80 border-border/60 h-7 truncate border-l px-1.5 py-1 font-normal first:border-l-0"
                    >
                      {f.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    {resolved.fields.map((f) => (
                      <TableCell
                        key={f.name}
                        className="border-border/40 truncate border-l px-1.5 py-0.5 first:border-l-0"
                      >
                        {row[f.name] == null ? (
                          <span className="text-muted-foreground/40">—</span>
                        ) : (
                          String(row[f.name])
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {total > PREVIEW_INITIAL_LIMIT && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-primary hover:text-primary/80 mt-1 w-full cursor-pointer text-center text-[10px]"
          >
            {expanded
              ? `收起 · 显示前 ${PREVIEW_INITIAL_LIMIT} 行`
              : `展开 · 共 ${total} 行（最多显示 ${Math.min(total, PREVIEW_MAX_ROWS)} 行）`}
          </button>
        )}
      </div>
    </PropSection>
  )
}

// ─── Inline data — edit dialog + paste import ─────────────────────────

/** Read the clipboard as TSV / CSV and replace the widget's inline data. */
async function pasteDataIntoWidget(
  editor: ReturnType<typeof useDashboardEditor>,
  widgetId: string,
  slots: DataSlotDef[],
): Promise<void> {
  let text = ''
  try {
    text = await navigator.clipboard.readText()
  } catch {
    toast.error('无法读取剪贴板', { description: '请检查浏览器剪贴板权限' })
    return
  }
  if (!text.trim()) {
    toast.error('剪贴板为空')
    return
  }
  // Excel/Sheets copy as tab-separated; plain CSV as comma. Detect either.
  const delimiter = text.includes('\t') ? '\t' : ','
  const dataset = parseCsv(text, { delimiter, hasHeader: true })
  if (dataset.fields.length === 0) {
    toast.error('未能识别出表格数据')
    return
  }
  editor.setWidgetData(widgetId, {
    mode: 'inline',
    dataset,
    mapping: autoMapToSlots(dataset.fields, slots),
  })
  toast.success('已导入数据', {
    description: `${dataset.rows.length} 行 · ${dataset.fields.length} 列`,
  })
}

function InlineDataSection({
  widget,
  meta,
  slots,
}: {
  widget: WidgetNode
  meta: WidgetMeta | undefined
  slots: DataSlotDef[]
}) {
  const editor = useDashboardEditor()
  const [open, setOpen] = React.useState(false)
  const inlineData = widget.data?.mode === 'inline' ? widget.data : null
  const dataset = inlineData ? inlineData.dataset : meta?.dataSchema?.sample
  const rows = dataset?.rows.length ?? 0
  const cols = dataset?.fields.length ?? 0

  const openEditor = () => {
    // Promote sample → inline so the dialog has a real dataset to edit.
    if (!inlineData) editor.ensureInlineWidgetData(widget.id)
    setOpen(true)
  }

  return (
    <PropSection title="数据表">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="text-muted-foreground/80 text-[11px]">
          {rows} 行 · {cols} 列{!inlineData && ' · 示例'}
        </span>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="xs"
          onClick={() => void pasteDataIntoWidget(editor, widget.id, slots)}
        >
          <ClipboardPaste />
          粘贴导入
        </Button>
        <Button size="xs" onClick={openEditor}>
          <Pencil />
          编辑数据
        </Button>
      </div>
      <DataEditorDialog widgetId={widget.id} slots={slots} open={open} onOpenChange={setOpen} />
    </PropSection>
  )
}

function DataEditorDialog({
  widgetId,
  slots,
  open,
  onOpenChange,
}: {
  widgetId: string
  slots: DataSlotDef[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const editor = useDashboardEditor()
  const widget = useDocumentState((s) => selectWidget(widgetId)(s) ?? null)
  const dataset = widget?.data?.mode === 'inline' ? widget.data.dataset : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑数据</DialogTitle>
          <DialogDescription>
            直接编辑表格，或从 Excel / CSV 整块粘贴。Tab 切换单元格，Enter 下移一行。
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => void pasteDataIntoWidget(editor, widgetId, slots)}
          >
            <ClipboardPaste />
            粘贴导入（替换全部）
          </Button>
        </div>

        {dataset ? (
          <div className="max-h-[55vh] overflow-auto">
            <DatasetTableEditor widgetId={widgetId} dataset={dataset} />
          </div>
        ) : (
          <div className="text-muted-foreground/70 py-6 text-center text-[12px]">
            该组件暂无可编辑的内联数据
          </div>
        )}

        <DialogFooter>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
