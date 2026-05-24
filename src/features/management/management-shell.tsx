import * as React from 'react'
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar'
import { AppSidebar } from './components/app-sidebar'
import { SiteHeader } from './components/site-header'

/**
 * Management surface shell — slimmed down to a direct mirror of shadcn's
 * dashboard-01 entry layout:
 *
 *   <SidebarProvider style={--sidebar-width, --header-height}>
 *     <AppSidebar variant="inset" />
 *     <SidebarInset>
 *       <SiteHeader />
 *       <Outlet />
 *     </SidebarInset>
 *   </SidebarProvider>
 *
 * The two CSS variables are what wire the sidebar trigger animation, the
 * top bar's height, and the inset rail spacing together — they're not
 * decorative.
 */
export function ManagementShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 14)',
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
