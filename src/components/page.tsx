import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'

/**
 * Home page — a thin landing screen. Right now it just lets the user start
 * a new big-screen design; project listing / open-existing comes later.
 */
export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8">
      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">ai-view</h1>
        <p className="mt-2 text-sm text-muted-foreground">可视化大屏设计平台</p>
      </header>

      <Button asChild size="lg">
        <Link to="/editor-v2">
          <Plus />
          新建大屏
        </Link>
      </Button>
    </div>
  )
}
