import type * as React from 'react'
import type { WidgetNode } from '@schema/types'
import type { DashboardEditor } from '../editor/dashboard-editor'

/**
 * Props every Setter component receives. The setter is responsible
 * only for rendering the control and reporting changes via onChange.
 * Path resolution + commit-to-store happens in PropertyPanel.
 */
export interface SetterProps<T = unknown> {
  value: T
  defaultValue?: T
  onChange: (value: T) => void

  /** Forwarded from PropConfig.setterProps. */
  setterProps?: Record<string, unknown>

  /** Surrounding context the setter may need (e.g. data setter wants editor). */
  context: {
    node: WidgetNode
    editor: DashboardEditor
  }

  disabled?: boolean
}

export type SetterComponent<T = unknown> = React.ComponentType<SetterProps<T>>

/** Registry entry — wraps the component with its registry key. */
export interface SetterDefinition {
  type: string
  component: SetterComponent<any>
}
