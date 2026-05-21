import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { EditorRoot } from '@designer/ui/editor-root'
import { LocalStoragePersistence } from '@schema/index'
import type { PersistenceAdapter } from '@schema/persistence'
import { createNewProject, notifyProjectsChanged } from '~/features/management/use-projects'

/**
 * New editor (v2) — backed by the @designer architecture.
 *
 * Search params:
 *   - `?id=<projectId>`  load that project
 *   - `?new=1`           create a fresh project then redirect with `?id=`
 *
 * No params → opens a brand-new in-memory project (legacy demo flow).
 */
const searchSchema = z.object({
  id: z.string().optional(),
  new: z
    .union([z.literal('1'), z.literal('true'), z.boolean()])
    .optional()
    .transform((v) => v === '1' || v === 'true' || v === true || undefined),
})

export const Route = createFileRoute('/editor-v2')({
  validateSearch: searchSchema,
  component: EditorV2Page,
})

/**
 * Wrap the standard adapter so every mutation also fires
 * `notifyProjectsChanged()` — that's how the management list /
 * dashboard tile re-fetch after the user saves an edit.
 */
function createNotifyingAdapter(): PersistenceAdapter {
  const base = new LocalStoragePersistence()
  return {
    load: (id) => base.load(id),
    list: () => base.list(),
    exportJson: (id) => base.exportJson(id),
    async save(project) {
      await base.save(project)
      notifyProjectsChanged()
    },
    async create(opts) {
      const p = await base.create(opts)
      notifyProjectsChanged()
      return p
    },
    async delete(id) {
      await base.delete(id)
      notifyProjectsChanged()
    },
    async importJson(json) {
      const p = await base.importJson(json)
      notifyProjectsChanged()
      return p
    },
  }
}

function EditorV2Page() {
  const { id, new: isNew } = Route.useSearch()
  const navigate = useNavigate()
  const [creating, setCreating] = React.useState(isNew === true)
  const adapter = React.useMemo(createNotifyingAdapter, [])

  React.useEffect(() => {
    if (isNew !== true) return
    setCreating(true)
    void (async () => {
      const project = await createNewProject()
      await navigate({
        to: '/editor-v2',
        search: { id: project.id },
        replace: true,
      })
      setCreating(false)
    })()
  }, [isNew, navigate])

  if (creating) {
    return (
      <div className="text-muted-foreground flex h-screen w-screen items-center justify-center text-sm">
        正在创建新大屏…
      </div>
    )
  }

  return (
    <div className="h-screen w-screen">
      <EditorRoot key={id ?? '_new'} projectId={id} adapter={adapter} />
    </div>
  )
}
