import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronsUpDown, LayoutDashboard, Plus, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '~/components/ui/sidebar'

/**
 * Brand area in the sidebar header — mirrors shadcn's TeamSwitcher pattern.
 *
 * The app is single-tenant for now so there's nothing real to switch
 * between; the dropdown surfaces a `+ 新建工作区` placeholder + a quick
 * link to settings, which is the conventional shape and gives the design
 * room to grow without rewiring the layout.
 */
export function TeamSwitcher() {
  const { isMobile } = useSidebar()

  return (
    <SidebarMenu>
      {/*
        In icon-collapsed mode, make the LI a flex container with
        justify-center so the fixed-width (size-8!) button is centered
        horizontally inside the SidebarHeader padding. Plain `mx-auto`
        on the button doesn't always center reliably across browsers
        because the button is a block-level flex inside a `list-item`
        LI; turning the LI into an explicit flex container is the
        bullet-proof fix.
      */}
      <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {/*
                `shrink-0` is essential — the SidebarMenuButton applies
                `[&_svg]:shrink-0` to inner SVGs but NOT to plain divs.
                Without it the flex layout squashes the logo box to 0px
                when the sidebar collapses to its icon rail.

                Text + chevron are explicitly hidden in icon mode so the
                flex doesn't allocate space (and `flex-1` doesn't try to
                grow into negative room).
              */}
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg">
                <LayoutDashboard className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">大屏管理</span>
                <span className="text-muted-foreground truncate text-xs">
                  默认工作区
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              工作区
            </DropdownMenuLabel>
            <DropdownMenuItem className="gap-2 p-2">
              <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                <LayoutDashboard className="size-3.5 shrink-0" />
              </div>
              <span className="flex-1">大屏管理</span>
              <DropdownMenuShortcut>⌘1</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="bg-background flex size-6 items-center justify-center rounded-md border">
                <Plus className="size-4" />
              </div>
              <span className="text-muted-foreground font-medium">新建工作区</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 p-2">
              <Link to="/management/settings">
                <Settings className="size-4" />
                工作区设置
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
