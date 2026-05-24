import { Link, useLocation } from '@tanstack/react-router'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '~/components/ui/sidebar'
import { NAV_SECTIONS } from '../nav-config'
import { useProjectCount } from '../use-projects'

/**
 * Primary navigation — one `<SidebarGroup>` per section in `NAV_SECTIONS`,
 * driven by route matching. `tooltip` props give the icon-collapsed sidebar
 * proper hover labels.
 *
 * Counts that need live data (currently just `screens`) come from a small
 * lookup table here so `nav-config.ts` stays a static data file.
 */
export function NavMain() {
  const { pathname } = useLocation()
  const screenCount = useProjectCount()
  const dynamicCounts: Record<string, number | undefined> = { screens: screenCount }

  return (
    <>
      {NAV_SECTIONS.map((section) => (
        <SidebarGroup key={section.label}>
          <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map((item) => {
                const isActive = pathname === item.to
                const count = dynamicCounts[item.id] ?? item.count
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link to={item.to}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {count != null && <SidebarMenuBadge>{count}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}
