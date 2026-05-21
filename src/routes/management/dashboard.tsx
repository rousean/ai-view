import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '~/features/management/pages/dashboard-page'

export const Route = createFileRoute('/management/dashboard')({
  component: DashboardPage,
})
