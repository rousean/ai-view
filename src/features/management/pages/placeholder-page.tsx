import { Image as ImageIcon } from 'lucide-react'

/**
 * Empty-state placeholder for management routes that haven't shipped yet.
 * Matches the handoff: header toolbar (title + sub) + bordered card with
 * a muted icon block and copy.
 */
export function PlaceholderPage({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="px-6 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{sub}</p>
        </div>
      </div>
      <div className="border-border bg-card flex flex-col items-center gap-3 rounded-lg border px-6 py-20 text-center">
        <div className="bg-muted text-muted-foreground flex h-14 w-14 items-center justify-center rounded-xl">
          <ImageIcon className="size-7" />
        </div>
        <div className="text-base font-medium">{title}页面</div>
        <div className="text-muted-foreground text-sm">
          这里之后会放 {title} 的内容
        </div>
      </div>
    </div>
  )
}
