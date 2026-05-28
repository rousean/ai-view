import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'

export type FetchStatus =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'success'; updatedAt: number }
  | { state: 'error'; error: string; updatedAt: number }

export interface WidgetError {
  message: string
  stack?: string
}

/**
 * What the renderer is currently doing:
 *   - `design`  — full editor: chrome, selection, interactions configured but
 *                 not fired, animation only via preview button.
 *   - `preview` — full-screen read-only run of the project. Animations play
 *                 once on mount, configured `widget.events` actually
 *                 dispatch, the canvas fits the viewport, and panels hide.
 *
 * We intentionally don't expose a third "runtime" state — the published
 * runtime renderer will spin up its own store with `mode: 'preview'`
 * baked in. Keeping the editor binary keeps switch logic readable.
 */
export type RuntimeMode = 'design' | 'preview'

export interface RuntimeState {
  /** dataSourceId → fetched data (after source-level transforms). */
  fetchedData: Record<string, unknown>
  /** dataSourceId → status. */
  fetchStatus: Record<string, FetchStatus>
  /** Design-time mock master switch. */
  designTimeMockMode: boolean
  /** widgetId → render error. */
  widgetErrors: Record<string, WidgetError | undefined>
  /**
   * Bumped each time the user clicks "preview animation" on a widget.
   * WidgetContainer keys off `${widgetId}-${tokens[id]}` so a token
   * change forces a re-mount, which is the simplest way to make a CSS
   * keyframe re-play deterministically.
   */
  animationPreviewTokens: Record<string, number>
  /** Current canvas mode — drives WidgetContainer event wiring. */
  mode: RuntimeMode
  /**
   * Set of widget ids currently flashing the highlight effect (from
   * an action's `highlight` payload). Auto-cleared on timeout by the
   * dispatcher.
   */
  highlightedIds: Set<string>

  actions: {
    setFetchedData: (sourceId: string, data: unknown) => void
    setFetchStatus: (sourceId: string, status: FetchStatus) => void
    clearFetched: (sourceId: string) => void
    setMockMode: (enabled: boolean) => void
    setWidgetError: (widgetId: string, err: WidgetError | undefined) => void
    bumpAnimationPreview: (widgetId: string) => void
    setMode: (next: RuntimeMode) => void
    addHighlights: (ids: string[]) => void
    removeHighlights: (ids: string[]) => void
    clearAll: () => void
  }
}

export const useRuntimeStore = create<RuntimeState>()(
  devtools(
    subscribeWithSelector((set) => ({
      fetchedData: {},
      fetchStatus: {},
      designTimeMockMode: true,
      widgetErrors: {},
      animationPreviewTokens: {},
      mode: 'design',
      highlightedIds: new Set(),

      actions: {
        setFetchedData: (sourceId, data) =>
          set(
            (s) => ({ fetchedData: { ...s.fetchedData, [sourceId]: data } }),
            false,
            'runtime/setFetchedData',
          ),
        setFetchStatus: (sourceId, status) =>
          set(
            (s) => ({ fetchStatus: { ...s.fetchStatus, [sourceId]: status } }),
            false,
            'runtime/setFetchStatus',
          ),
        clearFetched: (sourceId) =>
          set(
            (s) => {
              const data = { ...s.fetchedData }
              const status = { ...s.fetchStatus }
              delete data[sourceId]
              delete status[sourceId]
              return { fetchedData: data, fetchStatus: status }
            },
            false,
            'runtime/clearFetched',
          ),
        setMockMode: (enabled) =>
          set({ designTimeMockMode: enabled }, false, 'runtime/setMockMode'),
        setWidgetError: (widgetId, err) =>
          set(
            (s) => ({
              widgetErrors: { ...s.widgetErrors, [widgetId]: err },
            }),
            false,
            'runtime/setWidgetError',
          ),
        bumpAnimationPreview: (widgetId) =>
          set(
            (s) => ({
              animationPreviewTokens: {
                ...s.animationPreviewTokens,
                [widgetId]: (s.animationPreviewTokens[widgetId] ?? 0) + 1,
              },
            }),
            false,
            'runtime/bumpAnimationPreview',
          ),
        setMode: (next) => set({ mode: next }, false, 'runtime/setMode'),
        addHighlights: (ids) =>
          set(
            (s) => {
              const next = new Set(s.highlightedIds)
              for (const id of ids) next.add(id)
              return { highlightedIds: next }
            },
            false,
            'runtime/addHighlights',
          ),
        removeHighlights: (ids) =>
          set(
            (s) => {
              const next = new Set(s.highlightedIds)
              for (const id of ids) next.delete(id)
              return { highlightedIds: next }
            },
            false,
            'runtime/removeHighlights',
          ),
        clearAll: () =>
          set(
            {
              fetchedData: {},
              fetchStatus: {},
              widgetErrors: {},
              animationPreviewTokens: {},
              highlightedIds: new Set(),
            },
            false,
            'runtime/clearAll',
          ),
      },
    })),
    { name: 'RuntimeStore' },
  ),
)
