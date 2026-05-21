import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * Root path bounces straight to the management surface. The "ai-view" app
 * is, in product terms, the management console — there is no separate
 * marketing / landing page.
 */
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/management/dashboard' })
  },
})
