import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/features/management/pages/placeholder-page'

export const Route = createFileRoute('/management/assets')({
  component: () => (
    <PlaceholderPage title="资源库" sub="图片、图标、背景等设计资源。" />
  ),
})
