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

export interface RuntimeState {
  /** dataSourceId → fetched data (after source-level transforms). */
  fetchedData: Record<string, unknown>
  /** dataSourceId → status. */
  fetchStatus: Record<string, FetchStatus>
  /** Design-time mock master switch. */
  designTimeMockMode: boolean
  /** widgetId → render error. */
  widgetErrors: Record<string, WidgetError | undefined>

  actions: {
    setFetchedData: (sourceId: string, data: unknown) => void
    setFetchStatus: (sourceId: string, status: FetchStatus) => void
    clearFetched: (sourceId: string) => void
    setMockMode: (enabled: boolean) => void
    setWidgetError: (widgetId: string, err: WidgetError | undefined) => void
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
        clearAll: () =>
          set(
            {
              fetchedData: {},
              fetchStatus: {},
              widgetErrors: {},
            },
            false,
            'runtime/clearAll',
          ),
      },
    })),
    { name: 'RuntimeStore' },
  ),
)
