import type { LucideIcon } from 'lucide-react'

/**
 * Interaction system — connects a widget runtime event ("user clicked
 * me", "user hovered me") to an action the host page should perform
 * ("open url X", "filter chart Y by this value"). Persisted on
 * `WidgetNode.events` (EventBinding[]).
 *
 * The two halves are registered independently so a plugin can drop in
 * a new action (e.g. "trigger animation") without touching trigger
 * definitions, and vice-versa.
 */

export interface ParamFieldDef {
  /** Path within the params bag — flat for the built-ins. */
  key: string
  label: string
  placeholder?: string
  /** Setter registry key — reuses the same setters as PropConfig. */
  setter: string
  setterProps?: Record<string, unknown>
  /** Optional default — applied when the binding is first created. */
  defaultValue?: unknown
  description?: string
}

export interface TriggerDef {
  /** Registry key — referenced by EventBinding.trigger. */
  type: string
  label: string
  description?: string
  icon: LucideIcon
}

export interface ActionDef {
  /** Registry key — referenced by EventBinding.action.type. */
  type: string
  label: string
  description?: string
  icon: LucideIcon
  /** Schema for parameter form. Empty = no params. */
  params?: ParamFieldDef[]
}

export interface InteractionRegistry {
  triggers: TriggerDef[]
  actions: ActionDef[]
}
