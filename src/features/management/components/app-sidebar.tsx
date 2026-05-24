import * as React from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '~/components/ui/sidebar'
import { NavMain } from './nav-main'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'

/**
 * Application sidebar — composes TeamSwitcher (brand) + NavMain (route
 * groups) + NavUser (account dropdown) per shadcn's sidebar-07 block.
 *
 * `variant="inset"` lifts the sidebar off the edges (margin + rounded
 * corners on desktop). `collapsible="icon"` lets it collapse to a 3rem
 * rail with hover tooltips.
 */
export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
