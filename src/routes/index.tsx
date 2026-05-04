import { createFileRoute } from '@tanstack/react-router'
import Page from '~/components/page'
export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Page />
}
