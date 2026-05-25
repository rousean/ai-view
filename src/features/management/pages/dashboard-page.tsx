import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Edit, Eye, Plus, RotateCcw } from 'lucide-react'
import type { ProjectStatus } from '@schema/types'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { ProjectRuntime } from '../components/project-runtime'
import { createNewProject, useProjects } from '../use-projects'

/**
 * Dashboard tile — embeds the most-recently-edited project as a read-only
 * fit-to-container preview, framed in a shadcn Card.
 *
 *   - Title / description / status come from the live project
 *   - "刷新" forces the runtime to re-mount (re-reads localStorage)
 *   - "编辑大屏" navigates with the current id
 *   - Empty state when no projects exist (also a Card, with a CTA)
 */
const STATUS_LABEL: Record<
  ProjectStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  published: { label: '已发布', variant: 'default' },
  draft: { label: '草稿', variant: 'secondary' },
  review: { label: '审核中', variant: 'outline' },
  archived: { label: '已归档', variant: 'destructive' },
}

export function DashboardPage() {
  const { items, loading } = useProjects()
  const navigate = useNavigate()
  const wrapRef = React.useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = React.useState(0.5)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [now, setNow] = React.useState(() => new Date())
  const [creating, setCreating] = React.useState(false)

  const current = items[0] // most recently updated

  // Refit canvas on container resize.
  React.useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      const s = Math.min(width / 1920, height / 1080)
      setScale(Number.isFinite(s) && s > 0 ? s : 0.5)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Tick the live clock once a second.
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const onCreate = async () => {
    setCreating(true)
    try {
      const project = await createNewProject()
      await navigate({ to: '/editor-v2', search: { id: project.id } })
    } finally {
      setCreating(false)
    }
  }

  // ── Empty state ───────────────────────────────────────────────────
  if (!loading && !current) {
    return (
      <div className="px-6 pb-6">
        <DashboardHeader />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="bg-muted text-muted-foreground flex h-14 w-14 items-center justify-center rounded-xl">
              <Eye className="size-7" />
            </div>
            <div className="text-base font-medium">还没有可展示的大屏</div>
            <div className="text-muted-foreground text-sm">
              先去新建一个大屏，回来这里就会自动展示。
            </div>
            <Button size="sm" className="mt-2" onClick={() => void onCreate()} disabled={creating}>
              <Plus />
              {creating ? '创建中…' : '新建大屏'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const status = current?.status
  const statusMeta = status ? STATUS_LABEL[status] : null

  return (
    <div className="px-6 pb-6">
      <DashboardHeader
        actions={
          <>
            <Badge variant="outline" className="h-8 gap-2 px-3 tabular-nums">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              实时数据 ·{' '}
              {now.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              <RotateCcw />
              刷新
            </Button>
            {current && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/editor-v2" search={{ id: current.id }}>
                    <Edit />
                    编辑大屏
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/preview/$id" params={{ id: current.id }}>
                    <Eye />
                    全屏预览
                  </Link>
                </Button>
              </>
            )}
          </>
        }
      />

      <Card className="pb-0">
        <CardHeader className="border-b">
          <CardTitle>{current?.name ?? '加载中…'}</CardTitle>
          <CardDescription>1920 × 1080 · 比例 16:9</CardDescription>
          {statusMeta && (
            <CardAction>
              <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
            </CardAction>
          )}
        </CardHeader>
        <div
          ref={wrapRef}
          className="relative flex aspect-video min-h-[400px] items-center justify-center overflow-hidden p-6"
          style={{
            background: '#050d1a',
            maxHeight: 'calc(100vh - var(--header-height, 56px) - 220px)',
          }}
        >
          {current ? (
            <ProjectRuntime
              key={`${current.id}-${reloadKey}`}
              projectId={current.id}
              scale={scale}
            />
          ) : (
            <div className="text-sm text-white/40">加载中…</div>
          )}
        </div>
      </Card>
    </div>
  )
}

function DashboardHeader({ actions }: { actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">仪表盘</h1>
        <p className="text-muted-foreground mt-1 text-sm">数据中心运行总览 · 实时更新</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
