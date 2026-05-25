import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Edit, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { ProjectRuntime } from '~/features/management/components/project-runtime'

/**
 * Full-screen runtime preview for a saved project.
 *
 * Read-only — no editor chrome, no panels. The canvas auto-scales to
 * fit the viewport (ResizeObserver-driven), keeping the artboard's
 * intrinsic 16:9 aspect ratio. A floating overlay holds "返回编辑" and
 * "退出" so the user can leave the preview without keyboard shortcuts.
 *
 * Esc also returns to the editor for the same project.
 */
export const Route = createFileRoute('/preview/$id')({
  component: PreviewPage,
})

function PreviewPage() {
  const { id } = Route.useParams()
  const wrapRef = React.useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = React.useState(0.5)

  // Refit on viewport resize.
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

  // Esc → back to editor for the same project.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.location.href = `/editor-v2?id=${encodeURIComponent(id)}`
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id])

  return (
    <div ref={wrapRef} className="relative h-screen w-screen overflow-hidden bg-black">
      <ProjectRuntime projectId={id} scale={scale} />

      {/* Floating overlay — hidden until cursor enters the top-right corner.
          Keeps the preview clean while still letting the user escape. */}
      <div className="group/overlay absolute top-0 right-0 z-50 p-3">
        <div className="flex items-center gap-1.5 rounded-md bg-black/60 p-1 opacity-0 backdrop-blur-sm transition-opacity hover:opacity-100 group-hover/overlay:opacity-100">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white" asChild>
            <Link to="/editor-v2" search={{ id }}>
              <Edit />
              返回编辑
            </Link>
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10 hover:text-white" asChild>
            <Link to="/management/dashboard">
              <X />
            </Link>
          </Button>
        </div>
      </div>

      {/* Larger hover hit area in the corner — without this the overlay
          only shows when you're already inside the bubble. */}
      <div className="absolute top-0 right-0 z-40 h-16 w-40" aria-hidden />
    </div>
  )
}
