import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Schema, Data, Props, Meta } from '~/features/component-library/type'

export type Camera = {
  x: number
  y: number
  scale: number
}

export type Element = {
  id: string
  type: string
  title: string

  schema: Schema
  data: Data
  props: Props

  runtime: {
    locked?: boolean
    hidden?: boolean
    groupId?: string
  }
}

type Snapshot = {
  elements: Record<string, Element>
  camera: {
    x: number
    y: number
    scale: number
  }
  runtime: {
    selectedIds: string[]
  }
}

export type SelectionRect = {
  x: number
  y: number
  width: number
  height: number
}

type Runtime = {
  selectedIds: string[]
  hoverId: string | null
  draggingId: string | null
  resizingId: string | null
  selectionRect: SelectionRect | null
}

type CanvasStore = {
  // 画布信息
  canvas: {
    id: string
    title: string
    width: number
    height: number
  }

  // 相机信息
  camera: Camera

  // 元素信息
  elements: Record<string, Element>

  // 运行时信息
  runtime: Runtime

  // 历史记录
  history: {
    past: Snapshot[]
    future: Snapshot[]
  }

  // 画布 action
  setCanvas: (canvas: Partial<CanvasStore['canvas']>) => void

  // 相机 action
  setCamera: (camera: Partial<CanvasStore['camera']>, options?: { history?: boolean }) => void

  // 元素 action
  addElement: (
    meta: Meta,
    layout?: Partial<Props['layout']>,
    runtime?: Partial<Element['runtime']>,
  ) => string
  /** `history: false` 用于拖拽等高频更新，避免每帧 snapshot；交互开始前请先 `pushHistorySnapshot` */
  updateElement: (
    id: string,
    updates: Partial<Omit<Element, 'id' | 'runtime'>> & { runtime?: Partial<Element['runtime']> },
    options?: { history?: boolean },
  ) => void

  /** 将当前文档记入撤销栈（拖拽/缩放开始前调用一次即可） */
  pushHistorySnapshot: () => void

  /**
   * 平移多个元素（相对 drag 开始时的 layout 快照 + 同一 delta）。
   * 不写入历史，请在拖拽前已 `pushHistorySnapshot`；会跳过 `runtime.locked`。
   */
  translateElementsFromLayouts: (
    snapshot: Record<string, Element['props']['layout']>,
    dx: number,
    dy: number,
  ) => void

  removeElement: (id: string) => void
  removeElements: (ids: string[]) => void

  // 运行时 action
  setSelectedIds: (ids: string[], options?: { history?: boolean }) => void
  clearSelectedIds: () => void
  setHoverId: (id: string | null) => void
  setDraggingId: (id: string | null) => void
  setResizingId: (id: string | null) => void
  setSelectionRect: (rect: SelectionRect | null) => void

  // 编组 action
  groupElements: (ids: string[], groupId?: string) => string
  ungroupElements: (groupId: string) => void

  // 历史 action
  undo: () => void
  redo: () => void
  clearHistory: () => void
}

export const useCanvasStore = create<CanvasStore>()(
  devtools(
    immer((set, get) => ({
      canvas: {
        id: crypto.randomUUID(),
        title: '新画布',
        width: 1920,
        height: 1080,
      },

      camera: {
        x: 50,
        y: 50,
        scale: 1,
      },

      elements: {},

      runtime: {
        selectedIds: [],
        hoverId: null,
        draggingId: null,
        resizingId: null,
        selectionRect: null,
      },

      history: {
        past: [],
        future: [],
      },

      setCanvas: (canvas) =>
        set((state) => {
          pushHistory(state)
          state.canvas = { ...state.canvas, ...canvas }
        }),

      setCamera: (camera, options = { history: false }) =>
        set((state) => {
          if (options.history) pushHistory(state)
          state.camera = { ...state.camera, ...camera }
        }),

      addElement: (meta, layout = {}, runtime = {}) => {
        const id = crypto.randomUUID()
        set((state) => {
          pushHistory(state)
          const nextLayout = { ...meta.props.layout, ...layout }
          state.elements[id] = {
            id,
            type: meta.type,
            title: meta.title,
            schema: meta.schema,
            data: meta.data,
            props: {
              ...meta.props,
              layout: nextLayout,
            },
            runtime: {
              locked: runtime.locked ?? false,
              hidden: runtime.hidden ?? false,
              groupId: runtime.groupId ?? '',
            },
          }
          state.runtime.selectedIds = [id]
        })
        return id
      },

      updateElement: (id, updates, options) =>
        set((state) => {
          const element = state.elements[id]
          if (!element) return

          if (options?.history !== false) pushHistory(state)
          const { runtime, ...rest } = updates
          Object.assign(element, rest)
          if (runtime) element.runtime = { ...element.runtime, ...runtime }
        }),

      pushHistorySnapshot: () =>
        set((state) => {
          pushHistory(state)
        }),

      translateElementsFromLayouts: (snapshot, dx, dy) =>
        set((state) => {
          const { width: cw, height: ch } = state.canvas
          for (const [id, start] of Object.entries(snapshot)) {
            const el = state.elements[id]
            if (!el || el.runtime.locked) continue
            const nextX = Math.min(Math.max(0, Math.round(start.x + dx)), cw - start.width)
            const nextY = Math.min(Math.max(0, Math.round(start.y + dy)), ch - start.height)
            el.props.layout = { ...el.props.layout, x: nextX, y: nextY }
          }
        }),

      removeElement: (id) =>
        set((state) => {
          if (!state.elements[id]) return

          pushHistory(state)
          delete state.elements[id]
          cleanupRuntimeIds(state, [id])
        }),

      removeElements: (ids) =>
        set((state) => {
          const existingIds = ids.filter((id) => state.elements[id])
          if (existingIds.length === 0) return

          pushHistory(state)
          existingIds.forEach((id) => delete state.elements[id])
          cleanupRuntimeIds(state, existingIds)
        }),

      setSelectedIds: (ids, options = { history: false }) =>
        set((state) => {
          const nextIds = ids.filter((id) => state.elements[id])
          if (options.history) pushHistory(state)
          state.runtime.selectedIds = nextIds
        }),

      clearSelectedIds: () =>
        set((state) => {
          state.runtime.selectedIds = []
        }),

      setHoverId: (id) =>
        set((state) => {
          state.runtime.hoverId = id && state.elements[id] ? id : null
        }),

      setDraggingId: (id) =>
        set((state) => {
          state.runtime.draggingId = id && state.elements[id] ? id : null
        }),

      setResizingId: (id) =>
        set((state) => {
          state.runtime.resizingId = id && state.elements[id] ? id : null
        }),

      setSelectionRect: (rect) =>
        set((state) => {
          state.runtime.selectionRect = rect
        }),

      groupElements: (ids, groupId = crypto.randomUUID()) => {
        set((state) => {
          const existingIds = ids.filter((id) => state.elements[id])
          if (existingIds.length === 0) return

          pushHistory(state)
          existingIds.forEach((id) => {
            state.elements[id].runtime.groupId = groupId
          })
          state.runtime.selectedIds = existingIds
        })
        return groupId
      },

      ungroupElements: (groupId) =>
        set((state) => {
          const groupElements = Object.values(state.elements).filter(
            (element) => element.runtime.groupId === groupId,
          )
          if (groupElements.length === 0) return

          pushHistory(state)
          groupElements.forEach((element) => {
            element.runtime.groupId = undefined
          })
        }),

      undo: () =>
        set((state) => {
          const snapshot = state.history.past.pop()
          if (!snapshot) return

          state.history.future.push(createSnapshot(state))
          restoreSnapshot(state, snapshot)
        }),

      redo: () =>
        set((state) => {
          const snapshot = state.history.future.pop()
          if (!snapshot) return

          state.history.past.push(createSnapshot(state))
          restoreSnapshot(state, snapshot)
        }),

      clearHistory: () =>
        set((state) => {
          state.history.past = []
          state.history.future = []
        }),
    })),
  ),
)

function structuredClone(obj: any) {
  return JSON.parse(JSON.stringify(obj))
}

function createSnapshot(state: CanvasStore): Snapshot {
  return {
    elements: structuredClone(state.elements),
    camera: structuredClone(state.camera),
    runtime: {
      selectedIds: [...state.runtime.selectedIds],
    },
  }
}

function restoreSnapshot(state: CanvasStore, snapshot: Snapshot) {
  state.elements = structuredClone(snapshot.elements)
  state.camera = structuredClone(snapshot.camera)
  state.runtime.selectedIds = [...snapshot.runtime.selectedIds]
  state.runtime.hoverId = null
  state.runtime.draggingId = null
  state.runtime.resizingId = null
  state.runtime.selectionRect = null
}

function pushHistory(state: CanvasStore) {
  state.history.past.push(createSnapshot(state))
  state.history.future = []
}

function cleanupRuntimeIds(state: CanvasStore, removedIds: string[]) {
  state.runtime.selectedIds = state.runtime.selectedIds.filter((id) => !removedIds.includes(id))

  if (state.runtime.hoverId && removedIds.includes(state.runtime.hoverId))
    state.runtime.hoverId = null
  if (state.runtime.draggingId && removedIds.includes(state.runtime.draggingId))
    state.runtime.draggingId = null
  if (state.runtime.resizingId && removedIds.includes(state.runtime.resizingId))
    state.runtime.resizingId = null
}
