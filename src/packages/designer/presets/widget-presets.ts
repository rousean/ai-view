/**
 * Widget style presets — per-widget-type bundles of `props` the user
 * has saved for later reuse. Stored in localStorage so they survive
 * across sessions; scope is per browser, not per project, by design
 * (presets are personal tastes, not document state).
 *
 * Storage layout: a single JSON object keyed by widget type, each
 * holding a list of named preset entries. Each entry stores only the
 * fields the user explicitly opted to capture (default = everything),
 * minus layout/data which never participate.
 */

const LS_KEY = 'ai-view.widget-presets.v1'

export interface WidgetPreset {
  id: string
  name: string
  createdAt: string
  props: Record<string, unknown>
}

type Catalogue = Record<string, WidgetPreset[]>

function loadCatalogue(): Catalogue {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object') return parsed as Catalogue
  } catch {
    // Corrupted JSON — treat as empty, don't crash the editor.
  }
  return {}
}

function saveCatalogue(cat: Catalogue) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(cat))
  } catch {
    // Quota / private-mode — silently drop; user can save again later.
  }
}

/** Get all presets for a widget type, newest-first. */
export function listPresets(widgetType: string): WidgetPreset[] {
  const cat = loadCatalogue()
  return cat[widgetType] ?? []
}

/**
 * Save a snapshot of `props` as a new preset. `name` is shown in the
 * picker; ids are generated locally and used for delete/apply lookup.
 *
 * We don't try to deduplicate by content — two presets with identical
 * props are allowed, because the user might want them under different
 * names ("草稿 A" / "草稿 B").
 */
export function savePreset(
  widgetType: string,
  name: string,
  props: Record<string, unknown>,
): WidgetPreset {
  const cat = loadCatalogue()
  const list = cat[widgetType] ?? []
  const preset: WidgetPreset = {
    id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || `预设 ${list.length + 1}`,
    createdAt: new Date().toISOString(),
    props: { ...props },
  }
  cat[widgetType] = [preset, ...list]
  saveCatalogue(cat)
  return preset
}

export function deletePreset(widgetType: string, presetId: string): void {
  const cat = loadCatalogue()
  const list = cat[widgetType]
  if (!list) return
  cat[widgetType] = list.filter((p) => p.id !== presetId)
  saveCatalogue(cat)
}

/** Rename an existing preset in place. */
export function renamePreset(
  widgetType: string,
  presetId: string,
  nextName: string,
): void {
  const cat = loadCatalogue()
  const list = cat[widgetType]
  if (!list) return
  const idx = list.findIndex((p) => p.id === presetId)
  if (idx < 0) return
  list[idx] = { ...list[idx]!, name: nextName.trim() || list[idx]!.name }
  saveCatalogue(cat)
}
