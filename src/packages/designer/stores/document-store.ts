import type { Patch } from 'immer'
import { applyPatches } from 'immer'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Project } from '@schema/types'

/**
 * DocumentStore — the single source of truth for the persistent project
 * schema. All public mutations go through HistoryManager; the underscore
 * setters here are intentionally *not* part of the editor-facing API.
 *
 * UI components must read state via the store hook + selectors and write
 * via the editor facade. Direct setState from outside the editor is a bug.
 */
export interface DocumentState {
  project: Project | null

  /** Internal setter — replace the whole project. Used by load(). */
  _setProject: (project: Project | null) => void

  /** Internal patch applier — used by HistoryManager. */
  _applyPatches: (patches: Patch[]) => void
}

export const useDocumentStore = create<DocumentState>()(
  devtools(
    (set) => ({
      project: null,
      _setProject: (project) => set({ project }, false, 'document/setProject'),
      _applyPatches: (patches) =>
        set(
          (state) => {
            if (!state.project) return state
            return { project: applyPatches(state.project, patches) }
          },
          false,
          'document/applyPatches',
        ),
    }),
    { name: 'DocumentStore' },
  ),
)
