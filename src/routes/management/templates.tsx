import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/features/management/pages/placeholder-page'

export const Route = createFileRoute('/management/templates')({
  component: () => (
    <PlaceholderPage title="模板市场" sub="发现并使用社区与官方模板。" />
  ),
})
