import { useDocumentState } from '../editor/editor-context'
import type { DashboardEditor } from '../editor/dashboard-editor'
import {
  DEFAULT_PROJECT_PALETTE,
  PALETTE_EXT_KEY,
  TOKEN_KEYS,
  TOKEN_LABELS,
  type ProjectPalette,
  type ProjectPaletteExtension,
} from './palette-types'

function normalizeHex(c: string | undefined): string {
  if (!c) return ''
  const s = c.trim().replace(/^#/, '').toUpperCase()
  if (s.length === 3) return s.split('').map((ch) => ch + ch).join('')
  return s
}

/**
 * Identify which palette slot (if any) a literal colour matches. Used
 * by ColorSetter / FontSetter to surface "= 主色" badges so authors
 * can see at a glance whether the value they entered is locked to a
 * palette token or just a one-off hex.
 *
 *   Returns:
 *     - { kind: 'token', key: 'primary', label: '主色' } for semantic hits
 *     - { kind: 'series', index: 0 } for `series[i]` hits
 *     - null when the colour doesn't match anything in the palette
 *
 * Semantic tokens are checked first so a colour that lives in both the
 * series ramp and a semantic slot (a common case for `primary`)
 * reports the more meaningful name.
 */
export type PaletteTokenMatch =
  | { kind: 'token'; key: keyof typeof TOKEN_LABELS; label: string }
  | { kind: 'series'; index: number }

export function matchPaletteToken(
  palette: ProjectPalette,
  color: string | undefined,
): PaletteTokenMatch | null {
  const target = normalizeHex(color)
  if (!target) return null
  for (const k of TOKEN_KEYS) {
    if (normalizeHex(palette[k]) === target) {
      return { kind: 'token', key: k, label: TOKEN_LABELS[k] }
    }
  }
  for (let i = 0; i < palette.series.length; i++) {
    if (normalizeHex(palette.series[i]) === target) {
      return { kind: 'series', index: i }
    }
  }
  return null
}

/**
 * Read access. Returns the project palette if set, otherwise the
 * defaults so callers can always treat it as defined. Pure read — no
 * side effect, suitable to call from render.
 */
export function selectPalette(state: {
  project?: { extensions?: Record<string, unknown> } | null
}): ProjectPalette {
  const ext = state.project?.extensions?.[PALETTE_EXT_KEY] as
    | ProjectPaletteExtension
    | undefined
  return ext?.palette ?? DEFAULT_PROJECT_PALETTE
}

/** React hook — subscribes to project palette changes via DocumentStore. */
export function usePalette(): ProjectPalette {
  return useDocumentState((s) => selectPalette(s))
}

/**
 * Write a new palette (partial merge) and persist via the
 * `project.setExtension` command — so the change participates in undo
 * history like any other edit.
 */
export function setPalette(
  editor: DashboardEditor,
  patch: Partial<ProjectPalette>,
): void {
  const project = editor.getProject()
  const current = (project?.extensions?.[PALETTE_EXT_KEY] as ProjectPaletteExtension | undefined)
    ?.palette ?? DEFAULT_PROJECT_PALETTE
  const next: ProjectPalette = { ...current, ...patch }
  editor.execute('project.setExtension', {
    key: PALETTE_EXT_KEY,
    value: { palette: next } satisfies ProjectPaletteExtension,
  })
}

/**
 * Replace the whole palette outright. Used by "apply template" — we
 * don't want to merge a template against the user's current palette
 * because that produces a Frankenstein result.
 */
export function replacePalette(
  editor: DashboardEditor,
  palette: ProjectPalette,
): void {
  editor.execute('project.setExtension', {
    key: PALETTE_EXT_KEY,
    value: { palette } satisfies ProjectPaletteExtension,
  })
}
