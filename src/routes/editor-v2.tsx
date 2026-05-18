import { createFileRoute } from '@tanstack/react-router'
import { EditorRoot } from '@designer/ui/editor-root'

/**
 * New editor (v2) — backed by the @designer architecture.
 *
 * The legacy editor at /designer continues to work. Once v2 reaches
 * feature parity, /designer can be flipped to point at this same root
 * and the old code under src/features/dashboard/edtior can be removed.
 */
export const Route = createFileRoute('/editor-v2')({
  component: EditorV2Page,
})

function EditorV2Page() {
  return (
    <div className="h-screen w-screen">
      <EditorRoot />
    </div>
  )
}
