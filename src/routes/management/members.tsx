import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/features/management/pages/placeholder-page'

export const Route = createFileRoute('/management/members')({
  component: () => (
    <PlaceholderPage title="成员" sub="邀请协作者，分配角色权限。" />
  ),
})
