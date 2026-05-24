import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * Legacy `/designer` route — the original editor that lived under
 * `src/features/dashboard/edtior` has been retired. Anything that
 * still links here ends up on the v2 editor.
 */
export const Route = createFileRoute('/designer')({
  beforeLoad: () => {
    throw redirect({ to: '/editor-v2' })
  },
})
