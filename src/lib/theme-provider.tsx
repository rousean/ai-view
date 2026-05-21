import * as React from 'react'

/**
 * Theme switcher for the app. Three user-facing options:
 *
 *   - `'light'`   force light
 *   - `'dark'`    force dark
 *   - `'system'`  follow the OS / browser (prefers-color-scheme)
 *
 * `resolvedTheme` is what's actually applied to `<html>` — never `'system'`.
 *
 * SSR & FOUC: the actual class is set by the inline script in __root before
 * React hydrates, so the first paint is correct. This provider is only the
 * runtime switcher and the React-side mirror.
 */
export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'aiview:theme'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  /**
   * `false` on the server and on the client's first render; flips to `true`
   * after the first useEffect. UI that varies with the *actual* (persisted)
   * theme — e.g. the toggle button's icon — should gate on this to avoid
   * hydration mismatches.
   */
  mounted: boolean
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

/**
 * Inline script run before React hydrates to set the `.dark` class +
 * `color-scheme` on `<html>`. Stringified so it can be embedded via
 * `dangerouslySetInnerHTML` in `__root`.
 *
 * Keep small and dependency-free — anything thrown here is silenced
 * because crashing the boot script would block the entire page.
 */
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var t = localStorage.getItem('${THEME_STORAGE_KEY}') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    if (dark) root.classList.add('dark');
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`.trim()

function readStoredTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system'
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

function systemPrefers(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Use a deterministic default for both SSR and the client's first paint.
  // The real value is loaded inside useEffect below so React never sees a
  // mismatch between server and client trees. The inline init script in
  // __root has already applied the correct class on <html>, so the page
  // doesn't flash.
  const [theme, setThemeState] = React.useState<Theme>('system')
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>('light')
  const [mounted, setMounted] = React.useState(false)

  // After hydration: pull persisted theme + OS preference into React state,
  // then subscribe for changes.
  React.useEffect(() => {
    setThemeState(readStoredTheme())
    setSystemTheme(systemPrefers())
    setMounted(true)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setSystemTheme(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme

  // Apply to <html>. This is what makes Tailwind's `dark:` variant fire.
  // Guarded by `mounted` so we don't fight the inline init script on first
  // paint (which already sets the right class).
  React.useEffect(() => {
    if (!mounted || typeof document === 'undefined') return
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.style.colorScheme = resolvedTheme
  }, [mounted, resolvedTheme])

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next)
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        // localStorage may be unavailable (private mode, quota) — ignore.
      }
    }
  }, [])

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme, mounted }),
    [theme, resolvedTheme, setTheme, mounted],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>')
  }
  return ctx
}
