import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/features/management/pages/placeholder-page'

export const Route = createFileRoute('/management/logs')({
  component: () => (
    <PlaceholderPage title="操作日志" sub="审计所有编辑、发布、协作记录。" />
  ),
})
