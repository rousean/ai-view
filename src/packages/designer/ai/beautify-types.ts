import type { WidgetNode } from '@schema/types'
import type { WidgetMeta } from '@widgets/widget-meta'

/**
 * One suggestion the AI returns. The shape stays small and JSON-safe so a
 * real LLM endpoint can produce it directly (no React, no closures).
 *
 * `propsPatch` is *merged* onto the widget — only the keys it touches
 * are overwritten; the user's structural edits survive.
 *
 * `swatch` shows the colour story on the suggestion card so the user
 * can pick without doing a full preview render for each option.
 */
export interface BeautifySuggestion {
  id: string
  title: string
  /** One-line description shown under the title. */
  summary: string
  /** Top 3 hex colours for the preview chip. */
  swatch: [string, string, string]
  /** Subset of `widget.props` to merge onto the widget on apply. */
  propsPatch: Record<string, unknown>
}

/**
 * The thing PropertyPanel calls. Real implementations talk to a backend
 * LLM; the built-in mock returns curated presets keyed off the widget
 * type so the UI works end-to-end without infrastructure.
 */
export interface BeautifyService {
  /**
   * Given the current widget snapshot, return 2-4 suggestion cards.
   * `signal` allows cancellation when the user dismisses the dialog
   * mid-request.
   */
  suggest(input: {
    widget: WidgetNode
    meta: WidgetMeta | undefined
  }, signal?: AbortSignal): Promise<BeautifySuggestion[]>
}
