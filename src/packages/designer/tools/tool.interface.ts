import type * as React from 'react'
import type { Point } from '@schema/types'
import type { DashboardEditor } from '../editor/dashboard-editor'

/**
 * Context provided to a tool's event handlers.
 *
 * `state` is a per-tool-instance scratchpad: its lifetime spans from
 * onActivate to onDeactivate. The editor never reads it.
 */
export interface ToolContext {
  editor: DashboardEditor
  state: Record<string, unknown>
  /**
   * Pointer location, both in screen and canvas coordinates.
   * Filled in by CanvasViewport before dispatching the event.
   */
  pointer: { screen: Point; canvas: Point }
}

/**
 * A tool is a stateless module (the state lives in `ctx.state`) that
 * reacts to pointer / wheel / keyboard events. Tools never write to the
 * document directly — they call `editor.execute(...)` on commit boundaries.
 */
export interface Tool {
  type: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  shortcut?: string
  /** Optional cursor override while this tool is active. */
  cursor?: string | ((ctx: ToolContext) => string)

  onActivate?(ctx: ToolContext): void
  onDeactivate?(ctx: ToolContext): void

  onPointerDown?(e: PointerEvent, ctx: ToolContext): void
  onPointerMove?(e: PointerEvent, ctx: ToolContext): void
  onPointerUp?(e: PointerEvent, ctx: ToolContext): void
  /**
   * Native double-click on the viewport. SelectTool uses this to
   * "isolate" a single group member for direct editing (Figma idiom).
   */
  onDoubleClick?(e: MouseEvent, ctx: ToolContext): void
  onWheel?(e: WheelEvent, ctx: ToolContext): void
  onKeyDown?(e: KeyboardEvent, ctx: ToolContext): void
  onKeyUp?(e: KeyboardEvent, ctx: ToolContext): void
}
