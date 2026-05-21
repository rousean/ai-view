/// <reference types="vite/client" />
import { HeadContent, Scripts, createRootRoute, Outlet } from '@tanstack/react-router'
import * as React from 'react'
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary'
import { NotFound } from '~/components/NotFound'
import appCss from '~/styles/app.css?url'
import { seo } from '~/utils/seo'
import { TooltipProvider } from '~/components/ui/tooltip'
import { ThemeProvider, THEME_INIT_SCRIPT } from '~/lib/theme-provider'
export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      ...seo({
        title: 'ai-view',
        description: `ai-view is a platform for creating and sharing AI-powered views. `,
      }),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      { rel: 'manifest', href: '/site.webmanifest', color: '#fffff' },
      { rel: 'icon', href: '/favicon.ico' },
    ],
    scripts: [
      {
        src: '/customScript.js',
        type: 'text/javascript',
      },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <ThemeProvider>
        <TooltipProvider>
          <Outlet />
        </TooltipProvider>
      </ThemeProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // `suppressHydrationWarning` is required because the inline theme init
    // script below mutates <html>'s className + style.colorScheme *before*
    // React hydrates. Without this, React's hydration check sees the
    // mismatch (server rendered no class, client already has `.dark`) and
    // warns. Same approach used by next-themes / shadcn docs.
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/*
          Pre-hydration theme init — sets `.dark` + `color-scheme` on <html>
          before React boots. Without this the page would always paint as
          light and then flash to dark when the provider's effect runs.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
