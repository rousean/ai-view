import { useId } from 'react'
import { Feedback } from '@dnd-kit/dom'
import { useDraggable } from '@dnd-kit/react'
import { getComponent } from '~/features/component-library/registry'
import type { Meta } from '~/features/component-library/type'

export default function Draggable({ meta }: { meta: Meta }) {
  const Component = getComponent(meta.type)
  if (!Component) return null

  const { ref } = useDraggable({
    id: useId(),
    type: 'materials',
    data: meta,
    plugins: [Feedback.configure({ feedback: 'clone', dropAnimation: null })],
  })

  return (
    <div
      ref={ref}
      className="flex justify-center items-center gap-2 border border-gray-200 rounded-md bg-accent cursor-grab active:cursor-grabbing transition-all overflow-hidden"
    >
      <Component props={meta.props} data={meta.data}></Component>
    </div>
  )
}
