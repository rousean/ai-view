import * as React from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Bell, LayoutDashboard, Monitor, Moon, Search, Sun } from 'lucide-react'
import { useTheme, type Theme } from '~/lib/theme-provider'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '~/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { breadcrumbFor, NAV_SECTIONS } from './nav-config'
import { useProjectCount } from './use-projects'

/**
 * Management surface shell — Figma handoff variant.
 *
 *   ┌─────────────┬──────────────────────────────────┐
 *   │  Sidebar    │  TopBar (trigger + breadcrumb …) │
 *   │  (sticky)   ├──────────────────────────────────┤
 *   │             │                                  │
 *   │             │  <Outlet />                      │
 *   │             │                                  │
 *   └─────────────┴──────────────────────────────────┘
 *
 * Active sidebar item is derived from the current route — no parallel
 * state machine. Cmd/Ctrl-B toggles the sidebar (built into shadcn's
 * SidebarProvider).
 */
export function ManagementShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const crumbs = breadcrumbFor(pathname)
  const screenCount = useProjectCount()

  // Counts that get filled in at runtime from real data sources. Keyed by
  // nav item id; undefined leaves the badge hidden.
  const dynamicCounts: Record<string, number | undefined> = {
    screens: screenCount,
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex h-12 items-center gap-2.5 px-2">
            <div className="bg-primary text-primary-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
              <LayoutDashboard className="size-3.5" />
            </div>
            <span className="truncate text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
              大屏管理
            </span>
          </div>
        </SidebarHeader>

        <SidebarContent>
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
                        {count != null && (
                          <SidebarMenuBadge>{count}</SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center gap-2.5 px-1 py-1">
            <div className="bg-muted text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium">
              Y
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-xs font-medium">Younger</div>
              <div className="text-muted-foreground truncate text-[11px]">
                younger@example.com
              </div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <TopBar crumbs={crumbs} />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

/**
 * Cycles theme: light → dark → system → light. Icon reflects the current
 * choice (Sun for light, Moon for dark, Monitor for system) — same idiom
 * shadcn uses in its own docs site.
 *
 * Before hydration, render a placeholder Sun icon and an inert aria-label
 * so the server-rendered HTML matches the client's first paint. After the
 * provider's effect runs (`mounted` flips true), swap in the real values.
 */
function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme()
  const next: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' }
  const label: Record<Theme, string> = {
    light: '浅色（切换到深色）',
    dark: '深色（切换到跟随系统）',
    system: '跟随系统（切换到浅色）',
  }
  const Icon = !mounted ? Sun : theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
  const text = mounted ? label[theme] : '切换主题'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={text}
          onClick={() => mounted && setTheme(next[theme])}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}

function TopBar({ crumbs }: { crumbs: string[] }) {
  return (
    <header className="border-border bg-background flex h-14 shrink-0 items-center gap-3 border-b px-3">
      <SidebarTrigger />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <React.Fragment key={`${c}-${i}`}>
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{c}</BreadcrumbPage>
                  ) : (
                    <span>{c}</span>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="搜索…"
            className="h-9 w-72 pr-12 pl-9"
          />
          <kbd className="bg-muted text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded px-1.5 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="通知" className="relative">
              <Bell />
              <span className="bg-destructive border-background absolute top-1.5 right-1.5 size-1.5 rounded-full border-2" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>通知</TooltipContent>
        </Tooltip>
        <ThemeToggle />
      </div>
    </header>
  )
}
