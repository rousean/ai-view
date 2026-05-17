import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/layout/')({
  component: LayoutComponent,
})

function LayoutComponent() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-lg font-semibold">My App</h1>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="bg-neutral-100 border-t border-neutral-200">
        <div className="container mx-auto px-4 py-3 text-sm text-neutral-600">
          <p>© 2026 My App. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
