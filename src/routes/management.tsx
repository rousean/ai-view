import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ManagementShell } from '~/features/management/management-shell'

/**
 * Layout route for the management surface. Renders the shadcn Sidebar +
 * top breadcrumb bar and a scrollable outlet for each sub-route.
 *
 *   /management/dashboard
 *   /management/screens
 *   /management/templates
 *   /management/data
 *   /management/assets
 *   /management/members
 *   /management/logs
 *   /management/settings
 */
export const Route = createFileRoute('/management')({
  component: ManagementLayout,
})

function ManagementLayout() {
  return (
    <ManagementShell>
      <Outlet />
    </ManagementShell>
  )
}
