import { Image as ImageIcon } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/card'

/**
 * Empty-state placeholder for management routes that haven't shipped yet.
 * Two zones:
 *
 *   - title row (matches the rest of the management pages)
 *   - shadcn Card with an icon block + short copy
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
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="bg-muted text-muted-foreground flex h-14 w-14 items-center justify-center rounded-xl">
            <ImageIcon className="size-7" />
          </div>
          <div className="text-base font-medium">{title}页面</div>
          <div className="text-muted-foreground text-sm">
            这里之后会放 {title} 的内容
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
