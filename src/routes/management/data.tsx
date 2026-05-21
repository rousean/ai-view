import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/features/management/pages/placeholder-page'

export const Route = createFileRoute('/management/data')({
  component: () => (
    <PlaceholderPage title="数据源" sub="管理 MySQL、API、Kafka 等数据连接。" />
  ),
})
