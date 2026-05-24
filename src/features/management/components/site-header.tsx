import * as React from 'react'
import { useLocation } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { SidebarTrigger } from '~/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { breadcrumbFor } from '../nav-config'
import { ModeToggle } from './mode-toggle'

/**
 * Top bar — mirrors shadcn's dashboard-01 `SiteHeader`:
 *
 *   - height tracks the provider's `--header-height` CSS var so the inset
 *     layout calculates spacing for us
 *   - the wrapper's `group-has-data-[collapsible=icon]/sidebar-wrapper`
 *     selector keeps the header reflow in sync with the sidebar collapse
 *   - vertical separator uses the radix `data-[orientation=vertical]`
 *     attribute instead of bespoke `self-center h-4`
 *
 * Breadcrumb is derived from the route via `breadcrumbFor`. Right side
 * gets the canonical ModeToggle, a notifications stub, and (future) user
 * actions if we ever break NavUser out of the sidebar footer.
 */
export function SiteHeader() {
  const { pathname } = useLocation()
  const crumbs = breadcrumbFor(pathname)

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="通知"
                className="relative"
              >
                <Bell />
                <span className="bg-destructive border-background absolute top-1.5 right-1.5 size-1.5 rounded-full border-2" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>通知</TooltipContent>
          </Tooltip>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
