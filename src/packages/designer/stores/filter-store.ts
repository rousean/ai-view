import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'

/**
 * Active cross-widget filter applied by a `filter` action. When widget
 * A's click action fires `filter`, it writes one of these against the
 * targeted widget B; widget B's data resolver reads it back and prunes
 * rows where `field !== value`.
 *
 * The `sourceId` lets the renderer paint the originator (e.g. flash the
 * connection line in preview mode) and also lets the dispatcher
 * collapse repeated clicks from the same source — clicking the same
 * slice twice toggles the filter off rather than re-applying it.
 */
export interface ActiveFilter {
  /** Which widget produced this filter. */
  sourceId: string
  /** Column name on the *target* widget being filtered. */
  field: string
  /** Value the source widget extracted from the user's interaction. */
  value: unknown
}

export interface FilterState {
  /** Per-target filters. Absent when nothing's pinned. */
  filters: Record<string, ActiveFilter | undefined>

  actions: {
    setFilter: (targetId: string, filter: ActiveFilter | null) => void
    clearAll: () => void
  }
}

/**
 * FilterStore — the runtime channel for widget-to-widget filter links (the
 * `filter` interaction action). Named distinctly from EditorStore's
 * `interaction` field (the canvas *gesture* state machine) so the two
 * "interaction" concepts don't collide. Lives at the renderer level (not
 * the document): it resets on preview enter/exit and is never persisted.
 */
export const useFilterStore = create<FilterState>()(
  devtools(
    subscribeWithSelector((set) => ({
      filters: {},
      actions: {
        setFilter: (targetId, filter) =>
          set(
            (s) => {
              const next = { ...s.filters }
              if (filter == null) delete next[targetId]
              else next[targetId] = filter
              return { filters: next }
            },
            false,
            'filter/setFilter',
          ),
        clearAll: () => set({ filters: {} }, false, 'filter/clearAll'),
      },
    })),
    { name: 'FilterStore' },
  ),
)

/** Read access — selector for use with React.useMemo / zustand subscribe. */
export function selectFilterForWidget(targetId: string) {
  return (state: FilterState) => state.filters[targetId]
}
