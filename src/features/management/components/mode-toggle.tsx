import { Moon, Sun } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { useTheme } from '~/lib/theme-provider'

/**
 * Canonical shadcn ModeToggle.
 *
 * The trigger holds two icons stacked on top of each other; the visible one
 * is selected by Tailwind's `dark:` variant + CSS rotate/scale — no React
 * state branches on `theme`, so the server- and client-rendered HTML are
 * always identical and there's no hydration mismatch.
 *
 * The dropdown writes through `useTheme().setTheme` (which is no-op until
 * the provider has mounted; that's fine because clicks can't happen before
 * hydration).
 */
export function ModeToggle() {
  const { setTheme } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="切换主题">
          <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">切换主题</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>浅色</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>深色</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>跟随系统</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
