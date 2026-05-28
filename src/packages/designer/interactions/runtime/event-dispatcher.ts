import type { EventBinding, WidgetNode } from '@schema/types'
import type { DashboardEditor } from '../../editor/dashboard-editor'
import { useInteractionStore } from '../../stores/interaction-store'
import { useRuntimeStore } from '../../stores/runtime-store'

/**
 * Payload threaded through every dispatched action. Carries the
 * originating widget plus the runtime data the user just interacted
 * with (a clicked slice's `{name, value}`, etc.) so actions like
 * `filter` can extract real filter values without re-querying.
 */
export interface DispatchContext {
  /** Widget the binding lives on. */
  source: WidgetNode
  /** Editor handle — used for navigatePage and project-level state. */
  editor: DashboardEditor
  /**
   * Free-form runtime detail. ECharts click events surface `name` and
   * `value`; HTML pointer events surface `x/y`. Actions take what they
   * need and ignore the rest.
   */
  detail?: Record<string, unknown>
}

/**
 * Trigger-aware lookup — given a widget's events list and the trigger
 * that just fired (`'click' | 'dblclick' | 'hover'`), return only the
 * enabled bindings that match.
 */
export function findMatchingBindings(
  bindings: readonly EventBinding[] | undefined,
  trigger: string,
): EventBinding[] {
  if (!bindings) return []
  return bindings.filter((b) => b.enabled && b.trigger === trigger)
}

/**
 * Dispatch every binding that matches a trigger. The renderer calls
 * this from its pointer handlers; we do nothing in `design` mode so
 * editing the configuration never accidentally navigates the user
 * away from the page.
 */
export function dispatchEvent(
  trigger: string,
  ctx: DispatchContext,
): void {
  if (useRuntimeStore.getState().mode !== 'preview') return
  const events = ctx.source.events
  for (const binding of findMatchingBindings(events, trigger)) {
    runAction(binding, ctx)
  }
}

/**
 * Per-action runtime implementation. Keep these intentionally small —
 * if an action grows knobs, extend its `params` schema and read them
 * here. Unknown action types are swallowed (logged in dev) so older
 * project files referencing dropped plugins don't crash the renderer.
 */
function runAction(binding: EventBinding, ctx: DispatchContext): void {
  const { type, params } = binding.action
  switch (type) {
    case 'openUrl': {
      const url = String(params.url ?? '').trim()
      if (!url) return
      const newTab = params.newTab !== false
      if (typeof window === 'undefined') return
      if (newTab) {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        window.location.href = url
      }
      return
    }

    case 'navigatePage': {
      const pageId = String(params.pageId ?? '')
      if (!pageId) return
      const project = ctx.editor.getProject()
      if (!project?.pages.find((p) => p.id === pageId)) return
      ctx.editor.execute('page.switch', { pageId })
      return
    }

    case 'highlight': {
      const targets = normalizeIds(params.targetWidgetIds)
      if (targets.length === 0) return
      const duration =
        typeof params.durationMs === 'number' && params.durationMs > 0
          ? params.durationMs
          : 800
      useRuntimeStore.getState().actions.addHighlights(targets)
      window.setTimeout(() => {
        useRuntimeStore.getState().actions.removeHighlights(targets)
      }, duration)
      return
    }

    case 'filter': {
      const target = String(params.targetWidgetId ?? '')
      const field = String(params.field ?? '')
      if (!target || !field) return
      const value = ctx.detail?.value ?? ctx.detail?.name ?? null

      // Toggle off if clicking the same source/value pair the filter
      // already holds — matches DataV's "click again to clear" idiom.
      const current = useInteractionStore.getState().filters[target]
      const setFilter = useInteractionStore.getState().actions.setFilter
      const isSame =
        current?.sourceId === ctx.source.id &&
        current.field === field &&
        Object.is(current.value, value)
      if (isSame) {
        setFilter(target, null)
      } else {
        setFilter(target, { sourceId: ctx.source.id, field, value })
      }
      return
    }

    default:
      if (import.meta.env?.DEV) {
        console.warn(`[event-dispatcher] unknown action type: ${type}`)
      }
  }
}

/** Coerce `string | string[] | unknown` → string[] of ids. */
function normalizeIds(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((x) => String(x)).filter(Boolean)
  }
  if (typeof input === 'string' && input.length > 0) {
    // Tolerate legacy comma-separated strings too.
    return input.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}
