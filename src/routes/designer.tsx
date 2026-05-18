import { createFileRoute } from '@tanstack/react-router'
import Editor from '~/features/dashboard/edtior/editor'

export const Route = createFileRoute('/designer')({
  component: Editor,
})
