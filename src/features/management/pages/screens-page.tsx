import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Filter,
  Plus,
  Search,
} from 'lucide-react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ProjectStatus } from '@schema/types'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Input } from '~/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { cn } from '~/lib/utils'
import { MiniThumb, type MiniThumbTheme } from '../components/mini-thumb'
import { ScreenRowActions } from '../components/screen-row-actions'
import {
  createNewProject,
  useProjects,
  type ScreenListItem,
} from '../use-projects'

// ─────────────────────────────────────────────────────────────────────
// Status presentation
// ─────────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  ProjectStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'outline' | 'destructive'
    dot: string
  }
> = {
  published: { label: '已发布', variant: 'default', dot: 'bg-green-500' },
  draft: { label: '草稿', variant: 'secondary', dot: 'bg-muted-foreground/60' },
  review: { label: '审核中', variant: 'outline', dot: 'bg-orange-500' },
  archived: { label: '已归档', variant: 'destructive', dot: 'bg-destructive' },
}

// Deterministic but varied thumbnail picker — same project always gets the
// same colour without storing anything on the schema.
const THUMB_THEMES: MiniThumbTheme[] = [
  'cyan',
  'purple',
  'green',
  'amber',
  'blue',
  'crimson',
]
function thumbFor(id: string): MiniThumbTheme {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return THUMB_THEMES[Math.abs(hash) % THUMB_THEMES.length]
}

/** Convert "2 hours ago" to a Chinese relative-time string. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  if (Number.isNaN(diff)) return iso
  const min = 60_000
  const hr = 60 * min
  const day = 24 * hr
  if (diff < min) return '刚刚'
  if (diff < hr) return `${Math.floor(diff / min)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hr)} 小时前`
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`
  return new Date(iso).toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  })
}

// ─────────────────────────────────────────────────────────────────────
// Column definitions
// ─────────────────────────────────────────────────────────────────────

const ch = createColumnHelper<ScreenListItem>()

function buildColumns() {
  return [
    ch.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? 'indeterminate'
                : false
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="全选"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label={`选择 ${row.original.name}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 36,
    }),
    ch.accessor('name', {
      header: '名称',
      cell: ({ row }) => {
        const r = row.original
        return (
          <Link
            to="/editor-v2"
            search={{ id: r.id }}
            className="flex items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-border h-8 w-14 shrink-0 overflow-hidden rounded border bg-black">
              <MiniThumb theme={thumbFor(r.id)} />
            </div>
            <div>
              <div className="text-sm leading-tight font-medium">{r.name}</div>
              <div className="text-muted-foreground mt-0.5 text-xs">
                {r.description ?? '未描述'}
              </div>
            </div>
          </Link>
        )
      },
    }),
    ch.accessor('status', {
      header: '状态',
      cell: ({ getValue }) => {
        const meta = STATUS_META[getValue()]
        return (
          <Badge variant={meta.variant} className="gap-1.5">
            <span className={cn('size-1.5 rounded-full', meta.dot)} />
            {meta.label}
          </Badge>
        )
      },
      size: 110,
    }),
    ch.accessor('updatedAt', {
      header: '最近编辑',
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{timeAgo(getValue())}</span>
      ),
      size: 140,
    }),
    ch.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ScreenRowActions id={row.original.id} name={row.original.name} />
        </div>
      ),
      size: 60,
    }),
  ]
}

// ─────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────

const TABS: Array<{ id: 'all' | ProjectStatus; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'published', label: '已发布' },
  { id: 'draft', label: '草稿' },
  { id: 'archived', label: '归档' },
]

export function ScreensPage() {
  const navigate = useNavigate()
  const { items, loading, error } = useProjects()
  const [tab, setTab] = React.useState<'all' | ProjectStatus>('all')
  const [search, setSearch] = React.useState('')
  const [creating, setCreating] = React.useState(false)

  const filtered = React.useMemo(() => {
    const byTab = tab === 'all' ? items : items.filter((s) => s.status === tab)
    const q = search.trim().toLowerCase()
    if (!q) return byTab
    return byTab.filter((s) => s.name.toLowerCase().includes(q))
  }, [items, tab, search])

  const columns = React.useMemo(buildColumns, [])
  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const tabCounts = React.useMemo<Record<'all' | ProjectStatus, number>>(() => {
    return {
      all: items.length,
      published: items.filter((s) => s.status === 'published').length,
      draft: items.filter((s) => s.status === 'draft').length,
      review: items.filter((s) => s.status === 'review').length,
      archived: items.filter((s) => s.status === 'archived').length,
    }
  }, [items])

  const onCreate = async () => {
    setCreating(true)
    try {
      const project = await createNewProject()
      await navigate({ to: '/editor-v2', search: { id: project.id } })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="px-6 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">我的大屏</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            管理你创建和参与协作的所有大屏。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Download />
            导出
          </Button>
          <Button size="sm" onClick={() => void onCreate()} disabled={creating}>
            <Plus />
            {creating ? '创建中…' : '新建大屏'}
          </Button>
        </div>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-lg border">
        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b p-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | ProjectStatus)}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
                  {t.label}
                  <span className="bg-muted text-muted-foreground rounded-md px-1.5 text-[11px] tabular-nums data-[state=active]:bg-background">
                    {tabCounts[t.id]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
              <Input
                placeholder="搜索大屏…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-60 pl-9 text-xs"
              />
            </div>
            <Button variant="outline" size="sm" disabled>
              <Filter />
              筛选
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Columns3 />
              列
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    style={{ width: h.column.columnDef.size }}
                    className="text-muted-foreground h-10 px-4 text-xs font-medium"
                  >
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  加载中…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-destructive py-10 text-center text-sm"
                >
                  加载失败：{error}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground py-16 text-center text-sm"
                >
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-base font-medium">还没有任何大屏</div>
                      <Button size="sm" onClick={() => void onCreate()} disabled={creating}>
                        <Plus />
                        新建第一个大屏
                      </Button>
                    </div>
                  ) : (
                    '没有匹配的大屏'
                  )}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className="group/row"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="border-border text-muted-foreground flex items-center justify-between border-t px-5 py-3 text-sm">
          <div>
            显示 <strong className="text-foreground">{filtered.length}</strong> 共{' '}
            <strong className="text-foreground">{items.length}</strong> 个大屏
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="上一页"
            >
              <ChevronLeft />
            </Button>
            {Array.from({ length: table.getPageCount() || 1 }, (_, i) => {
              const active = table.getState().pagination.pageIndex === i
              return (
                <Button
                  key={i}
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => table.setPageIndex(i)}
                  className="min-w-8 px-2"
                >
                  {i + 1}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="下一页"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
