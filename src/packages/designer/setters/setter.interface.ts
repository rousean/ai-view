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

  /**
   * Surrounding context a setter may need (e.g. a data / reference setter
   * wants the editor + node). Optional so context-agnostic setters
   * (ColorSetter, StringSetter, …) can be rendered standalone — e.g. the
   * 画布 tab reuses ColorSetter for page-level colours, where there is no
   * single owning widget node.
   */
  context?: {
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
