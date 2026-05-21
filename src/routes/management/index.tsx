import { createFileRoute, redirect } from '@tanstack/react-router'

/** Default landing — bounces to the dashboard. */
export const Route = createFileRoute('/management/')({
  beforeLoad: () => {
    throw redirect({ to: '/management/dashboard' })
  },
})
