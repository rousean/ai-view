import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/features/management/pages/placeholder-page'

export const Route = createFileRoute('/management/settings')({
  component: () => (
    <PlaceholderPage title="设置" sub="账号偏好、通知与计费。" />
  ),
})
