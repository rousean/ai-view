import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  AlertCircle,
  ChevronDown,
  Database,
  FileSpreadsheet,
  FileText,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import type {
  ApiDataSource,
  CsvDataSource,
  DataSource,
  JsonDataSource,
} from '@schema/types'
import { fetchApiSourceOnce, parseCsv, parseJson } from '@designer/data'
import { toast } from '~/components/ui/sonner'
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
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Input } from '~/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'
import { useDashboardEditor, useDocumentState } from '../editor/editor-context'
import { useRuntimeStore } from '../stores/runtime-store'

/**
 * Real data-sources panel — replaces the demo list in secondary-panels.
 *
 *   [+ 新建 ▾] (api / csv / json / static)
 *   ─ 实时销售 ▼ api · 200ms 已加载
 *   ─ 用户表  ◯ csv · 124 行
 *   ─ 渠道维度 ✕ api · 错误：HTTP 500
 *
 * Click a row to open the editor dialog. Status pill reads
 * RuntimeStore.fetchStatus for api sources; csv/json display their
 * parsed row count.
 */
type EditorHandle = ReturnType<typeof useDashboardEditor>

/**
 * Build a blank data source of the given type, add it to the project, and
 * return it — so callers (the panel here, or the widget data tab) can open
 * it for editing / bind a widget to it.
 */
export function createDataSource(
  editor: EditorHandle,
  index: number,
  type: 'api' | 'csv' | 'json' | 'static',
): DataSource {
  const id = `ds_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const name = `数据源 ${index + 1}`
  let next: DataSource
  if (type === 'api') {
    next = {
      id,
      name,
      type: 'api',
      url: '',
      method: 'GET',
      responsePath: '',
      pollingInterval: 0,
      cache: { enabled: true, ttl: 30_000 },
      extensions: {},
    } satisfies ApiDataSource
  } else if (type === 'csv') {
    next = {
      id,
      name,
      type: 'csv',
      raw: '',
      delimiter: ',',
      hasHeader: true,
      extensions: {},
    } satisfies CsvDataSource
  } else if (type === 'json') {
    next = { id, name, type: 'json', raw: '', extensions: {} } satisfies JsonDataSource
  } else {
    next = { id, name, type: 'static', dataset: { fields: [], rows: [] }, extensions: {} }
  }
  editor.execute('dataSource.add', { source: next })
  return next
}

export function DataSourcesPanel() {
  const editor = useDashboardEditor()
  const sources = useDocumentState(
    useShallow((s) => s.project?.dataSources ?? []),
  )
  const [editorOpen, setEditorOpen] = React.useState<{ source: DataSource } | null>(null)

  const createSource = (type: 'api' | 'csv' | 'json' | 'static') => {
    setEditorOpen({ source: createDataSource(editor, sources.length, type) })
  }

  return (
    <div className="p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-primary w-full justify-start">
            <Plus size={14} />
            <span className="ml-1">新建数据源</span>
            <ChevronDown size={12} className="ml-auto opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem onSelect={() => createSource('api')}>
            <Globe />
            HTTP API
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => createSource('csv')}>
            <FileSpreadsheet />
            CSV / TSV
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => createSource('json')}>
            <FileText />
            JSON 数组
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => createSource('static')}>
            <Database />
            静态数据
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {sources.length === 0 ? (
        <div className="text-muted-foreground/60 mt-3 py-4 text-center text-[11px]">
          还没有数据源，点击上方新建。
        </div>
      ) : (
        <ul className="mt-2 space-y-0.5">
          {sources.map((s) => (
            <SourceRow key={s.id} source={s} onOpen={(src) => setEditorOpen({ source: src })} />
          ))}
        </ul>
      )}

      {editorOpen && (
        <DataSourceEditor
          source={editorOpen.source}
          onClose={() => setEditorOpen(null)}
        />
      )}
    </div>
  )
}

// ─── Row ──────────────────────────────────────────────────────────

function SourceRow({
  source,
  onOpen,
}: {
  source: DataSource
  onOpen: (src: DataSource) => void
}) {
  const editor = useDashboardEditor()
  const status = useRuntimeStore((s) => s.fetchStatus[source.id])
  // Look the icon up via the factory; render via React.createElement so
  // the rules-of-react linter doesn't treat `Icon` as a freshly
  // declared component on each render.
  const iconNode = React.createElement(iconFor(source.type), {
    size: 13,
    className: 'text-muted-foreground shrink-0',
  })
  const meta = describeSource(source, status)
  return (
    <li className="group/source hover:bg-muted/50 relative flex items-center gap-1.5 rounded-sm">
      <button
        type="button"
        className={cn(
          'flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2 py-1.5 text-left',
        )}
        onClick={() => onOpen(source)}
      >
        {iconNode}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-medium">{source.name}</div>
          <div
            className={cn(
              'truncate text-[10px]',
              status?.state === 'error' ? 'text-destructive' : 'text-muted-foreground/70',
            )}
          >
            {meta}
          </div>
        </div>
      </button>
      {status?.state === 'loading' && (
        <Loader2 size={11} className="text-muted-foreground/60 animate-spin shrink-0" />
      )}
      {status?.state === 'error' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertCircle size={11} className="text-destructive shrink-0" />
          </TooltipTrigger>
          <TooltipContent>{status.error}</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground/60 hover:text-destructive mr-1 opacity-0 group-hover/source:opacity-100"
            onClick={() => editor.execute('dataSource.remove', { id: source.id })}
            aria-label="删除数据源"
          >
            <Trash2 size={10} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>删除数据源</TooltipContent>
      </Tooltip>
    </li>
  )
}

function iconFor(type: string) {
  switch (type) {
    case 'api':
      return Globe
    case 'csv':
      return FileSpreadsheet
    case 'json':
      return FileText
    default:
      return Database
  }
}

function describeSource(
  source: DataSource,
  status?: { state: string; updatedAt?: number; error?: string },
): string {
  switch (source.type) {
    case 'api': {
      const url = (source as ApiDataSource).url
      const truncated = url.length > 26 ? url.slice(0, 26) + '…' : url || '未配置 URL'
      if (status?.state === 'error') return `错误：${status.error?.slice(0, 30) ?? ''}`
      if (status?.state === 'loading') return `加载中… · ${truncated}`
      if (status?.state === 'success' && status.updatedAt) {
        return `${formatAge(Date.now() - status.updatedAt)} · ${truncated}`
      }
      return `API · ${truncated}`
    }
    case 'csv': {
      const ds = (source as CsvDataSource).dataset
      return ds ? `CSV · ${ds.rows.length} 行` : 'CSV · 未解析'
    }
    case 'json': {
      const ds = (source as JsonDataSource).dataset
      return ds ? `JSON · ${ds.rows.length} 行` : 'JSON · 未解析'
    }
    default:
      return '静态'
  }
}

function formatAge(deltaMs: number): string {
  if (deltaMs < 1000) return '刚刚'
  if (deltaMs < 60_000) return `${Math.round(deltaMs / 1000)} 秒前`
  return `${Math.round(deltaMs / 60_000)} 分钟前`
}

// ─── Editor dialog ────────────────────────────────────────────────

export function DataSourceEditor({
  source,
  onClose,
}: {
  source: DataSource
  onClose: () => void
}) {
  const editor = useDashboardEditor()
  const [draft, setDraft] = React.useState<DataSource>(source)
  React.useEffect(() => setDraft(source), [source])

  const commit = (next: DataSource) => {
    setDraft(next)
    editor.execute('dataSource.update', { id: next.id, patch: next })
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {React.createElement(iconFor(draft.type), { size: 14 })}
            编辑数据源
          </DialogTitle>
          <DialogDescription>
            类型：{draft.type} · ID:{' '}
            <span className="font-mono text-[11px]">{draft.id.slice(0, 14)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Name — universal */}
          <Field label="名称">
            <Input
              value={draft.name}
              onChange={(e) => commit({ ...draft, name: e.target.value })}
              className="h-7 text-[12px]"
            />
          </Field>

          {draft.type === 'api' && <ApiEditor draft={draft as ApiDataSource} commit={commit} />}
          {draft.type === 'csv' && <CsvEditor draft={draft as CsvDataSource} commit={commit} />}
          {draft.type === 'json' && <JsonEditor draft={draft as JsonDataSource} commit={commit} />}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-start gap-2">
      <label className="text-muted-foreground/80 pt-1.5 text-[11px]">{label}</label>
      <div>{children}</div>
    </div>
  )
}

// ── api editor ──

function ApiEditor({
  draft,
  commit,
}: {
  draft: ApiDataSource
  commit: (next: ApiDataSource) => void
}) {
  const status = useRuntimeStore((s) => s.fetchStatus[draft.id])
  return (
    <>
      <Field label="URL">
        <Input
          value={draft.url}
          placeholder="https://api.example.com/data"
          onChange={(e) => commit({ ...draft, url: e.target.value })}
          className="h-7 text-[12px]"
        />
      </Field>
      <Field label="方法">
        <div className="flex gap-1">
          {(['GET', 'POST'] as const).map((m) => (
            <Button
              key={m}
              variant={draft.method === m ? 'default' : 'outline'}
              size="xs"
              onClick={() => commit({ ...draft, method: m })}
            >
              {m}
            </Button>
          ))}
        </div>
      </Field>
      {draft.method === 'POST' && (
        <Field label="请求体">
          <textarea
            value={draft.body ?? ''}
            onChange={(e) => commit({ ...draft, body: e.target.value })}
            placeholder='{"key": "value"}'
            className="bg-muted hover:bg-muted/80 focus:bg-card focus:border-primary min-h-[60px] w-full rounded-sm border border-transparent p-2 font-mono text-[11px] outline-none"
          />
        </Field>
      )}
      <Field label="响应路径">
        <Input
          value={draft.responsePath ?? ''}
          placeholder="data.items"
          onChange={(e) => commit({ ...draft, responsePath: e.target.value })}
          className="h-7 text-[12px]"
        />
      </Field>
      <Field label="轮询">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            value={draft.pollingInterval ?? 0}
            onChange={(e) =>
              commit({ ...draft, pollingInterval: Math.max(0, Number(e.target.value) || 0) })
            }
            className="h-7 w-24 text-[12px]"
          />
          <span className="text-muted-foreground/60 text-[11px]">ms · 0 = 一次性</span>
        </div>
      </Field>
      <Field label="试运行">
        <Button
          variant="outline"
          size="xs"
          disabled={!draft.url.trim() || status?.state === 'loading'}
          onClick={() => {
            fetchApiSourceOnce(draft)
              .then((dataset) =>
                toast.success('请求成功', {
                  description: `${dataset.rows.length} 行 · ${dataset.fields.length} 列`,
                }),
              )
              .catch((err) =>
                toast.error('请求失败', { description: (err as Error).message }),
              )
          }}
        >
          <RefreshCw size={11} />
          <span className="ml-1">立即请求一次</span>
        </Button>
      </Field>
      <Field label="状态">
        <div className="text-[11px]">
          {status?.state === 'loading' && (
            <span className="text-muted-foreground/80 inline-flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" /> 加载中
            </span>
          )}
          {status?.state === 'error' && (
            <span className="text-destructive">错误：{status.error}</span>
          )}
          {status?.state === 'success' && (
            <span className="text-emerald-600 dark:text-emerald-400">
              ● 已加载 · {new Date(status.updatedAt).toLocaleTimeString()}
            </span>
          )}
          {!status && <span className="text-muted-foreground/60">未触发</span>}
        </div>
      </Field>
    </>
  )
}

// ── csv editor ──

function CsvEditor({
  draft,
  commit,
}: {
  draft: CsvDataSource
  commit: (next: CsvDataSource) => void
}) {
  const reparse = (raw: string, delimiter: string, hasHeader: boolean) => {
    const dataset = parseCsv(raw, { delimiter, hasHeader })
    commit({ ...draft, raw, delimiter, hasHeader, dataset })
  }
  return (
    <>
      <Field label="分隔符">
        <div className="flex gap-1">
          {[',', '\t', ';'].map((d) => (
            <Button
              key={d}
              variant={(draft.delimiter ?? ',') === d ? 'default' : 'outline'}
              size="xs"
              onClick={() => reparse(draft.raw, d, draft.hasHeader !== false)}
            >
              {d === '\t' ? 'Tab' : d}
            </Button>
          ))}
        </div>
      </Field>
      <Field label="首行表头">
        <Button
          variant={draft.hasHeader !== false ? 'default' : 'outline'}
          size="xs"
          onClick={() =>
            reparse(draft.raw, draft.delimiter ?? ',', !(draft.hasHeader !== false))
          }
        >
          {draft.hasHeader !== false ? '✓ 启用' : '禁用'}
        </Button>
      </Field>
      <Field label="原文">
        <textarea
          value={draft.raw}
          onChange={(e) =>
            reparse(e.target.value, draft.delimiter ?? ',', draft.hasHeader !== false)
          }
          placeholder="月份,销量&#10;一月,120&#10;二月,200"
          className="bg-muted hover:bg-muted/80 focus:bg-card focus:border-primary h-32 w-full rounded-sm border border-transparent p-2 font-mono text-[11px] outline-none"
        />
      </Field>
      <Field label="预览">
        <div className="text-muted-foreground/80 text-[11px]">
          {draft.dataset
            ? `${draft.dataset.rows.length} 行 · ${draft.dataset.fields.length} 列`
            : '尚未解析'}
        </div>
      </Field>
    </>
  )
}

// ── json editor ──

function JsonEditor({
  draft,
  commit,
}: {
  draft: JsonDataSource
  commit: (next: JsonDataSource) => void
}) {
  const [error, setError] = React.useState<string | null>(null)
  const reparse = (raw: string) => {
    const { dataset, error: err } = parseJson(raw)
    setError(err ?? null)
    commit({ ...draft, raw, dataset })
  }
  return (
    <>
      <Field label="JSON">
        <textarea
          value={draft.raw}
          onChange={(e) => reparse(e.target.value)}
          placeholder='[{"name": "A", "value": 1}, {"name": "B", "value": 2}]'
          className="bg-muted hover:bg-muted/80 focus:bg-card focus:border-primary h-32 w-full rounded-sm border border-transparent p-2 font-mono text-[11px] outline-none"
        />
      </Field>
      <Field label="预览">
        <div className="text-muted-foreground/80 text-[11px]">
          {error && <span className="text-destructive">解析错误：{error}</span>}
          {!error && draft.dataset && (
            <>
              {draft.dataset.rows.length} 行 · {draft.dataset.fields.length} 列
            </>
          )}
          {!error && !draft.dataset && '尚未解析'}
        </div>
      </Field>
      <Field label="手动刷新">
        <Button variant="outline" size="xs" onClick={() => reparse(draft.raw)}>
          <RefreshCw size={11} />
          <span className="ml-1">重新解析</span>
        </Button>
      </Field>
    </>
  )
}
