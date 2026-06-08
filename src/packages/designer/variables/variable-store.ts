import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { useDocumentState } from '../editor/editor-context'
import type { DashboardEditor } from '../editor/dashboard-editor'
import {
  VARIABLES_EXT_KEY,
  type ProjectVariable,
  type ProjectVariablesExtension,
} from './variable-types'

// ── Definitions (persisted in the document) ───────────────────────────

/**
 * Shared, referentially-stable empty result. A project with no variables
 * is the common case, and returning a fresh `[]` from the selector below
 * each call makes `useSyncExternalStore` consumers (`useVariableDefs`)
 * believe the snapshot changed every render — React then warns "getSnapshot
 * should be cached" and loops until "Maximum update depth exceeded". Handing
 * back one stable array keeps the snapshot referentially equal. Treated as
 * read-only by callers.
 */
const EMPTY_VARIABLES: ProjectVariable[] = []

/** Pure read of the project's variable definitions. */
export function selectVariables(state: {
  project?: { extensions?: Record<string, unknown> } | null
}): ProjectVariable[] {
  const ext = state.project?.extensions?.[VARIABLES_EXT_KEY] as
    | ProjectVariablesExtension
    | undefined
  return ext?.variables ?? EMPTY_VARIABLES
}

/** React hook — variable definitions, subscribed to DocumentStore. */
export function useVariableDefs(): ProjectVariable[] {
  return useDocumentState((s) => selectVariables(s))
}

/** Replace the variable definition list (undoable via project.setExtension). */
export function setVariableDefs(editor: DashboardEditor, variables: ProjectVariable[]): void {
  editor.execute('project.setExtension', {
    key: VARIABLES_EXT_KEY,
    value: { variables } satisfies ProjectVariablesExtension,
  })
}

// ── Runtime current values (volatile overrides) ───────────────────────

interface VariableRuntimeState {
  /** key → user-picked value. Effective value = override ?? def.default. */
  values: Record<string, string | number>
  actions: {
    setValue: (key: string, value: string | number) => void
    clearAll: () => void
  }
}

export const useVariableStore = create<VariableRuntimeState>()(
  devtools(
    subscribeWithSelector((set) => ({
      values: {},
      actions: {
        setValue: (key, value) =>
          set((s) => ({ values: { ...s.values, [key]: value } }), false, 'vars/setValue'),
        clearAll: () => set({ values: {} }, false, 'vars/clearAll'),
      },
    })),
    { name: 'VariableStore' },
  ),
)

/** Effective values = each def's default overridden by the runtime pick. */
export function effectiveVariableValues(
  defs: ProjectVariable[],
  overrides: Record<string, string | number>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const d of defs) out[d.key] = overrides[d.key] ?? d.defaultValue
  return out
}
