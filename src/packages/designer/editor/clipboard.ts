import type { WidgetNode } from '@schema/types'

/**
 * Clipboard payload format used for cross-tab paste via the system
 * clipboard (`navigator.clipboard`). The magic header lets us reject
 * arbitrary text — Cmd+V from "I copied some text in Notes.app" should
 * never spawn widgets. Bump the version when the on-disk shape changes
 * so old clipboard contents fail-cleanly instead of corrupting state.
 */
export const CLIPBOARD_MAGIC = 'aiview/widget@1.0'

/** Serialized widget — same shape as WidgetNode minus the `id`. */
export type SerializedWidget = Omit<WidgetNode, 'id'>

interface ClipboardPayload {
  version: '1.0'
  widgets: SerializedWidget[]
}

/**
 * Serialize a set of widgets into the wire format. Ids are stripped — the
 * paste path always allocates fresh ones so a copy → paste in the same
 * page doesn't produce id collisions.
 */
export function serializeWidgetsForClipboard(widgets: WidgetNode[]): string {
  const payload: ClipboardPayload = {
    version: '1.0',
    widgets: widgets.map(({ id: _id, ...rest }) => rest),
  }
  return `${CLIPBOARD_MAGIC}\n${JSON.stringify(payload)}`
}

/**
 * Parse text that came out of the system clipboard. Returns the widget
 * array, or `null` if the text isn't ours (or is malformed). Callers
 * should treat `null` as "fall back to the in-memory clipboard".
 */
export function deserializeWidgetsFromClipboard(text: string): SerializedWidget[] | null {
  if (!text || !text.startsWith(CLIPBOARD_MAGIC)) return null
  const newline = text.indexOf('\n')
  if (newline < 0) return null
  try {
    const json = JSON.parse(text.slice(newline + 1)) as ClipboardPayload
    if (!json || !Array.isArray(json.widgets)) return null
    return json.widgets
  } catch {
    return null
  }
}
