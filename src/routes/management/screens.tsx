import { createFileRoute } from '@tanstack/react-router'
import { ScreensPage } from '~/features/management/pages/screens-page'

export const Route = createFileRoute('/management/screens')({
  component: ScreensPage,
})
