import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Meta } from '~/features/component-library/type'

export type Position = {
  width: number
  height: number
  x: number
  y: number
  zIndex: number
  rotate: number
}

export type Runtime = {
  position: Position
  locked?: boolean
  hidden?: boolean
  groupId?: string
}

export type Element = Meta & {
  id: string
  position: Position
  locked?: boolean
  hidden?: boolean
  groupId?: string
}

export type Camera = {
  x: number
  y: number
  zoom: number
}

export type Canvas = {
  id: string
  title: string
  width: number
  height: number
  camera: Camera
  elements: Element[]
}

export type Bounds = {
  x: number
  y: number
  width: number
  height: number
}

export type ActiveDrag = {
  sourceId: string
  ids: string[]
  offset: {
    x: number
    y: number
  }
  startBounds: Bounds
  currentBounds: Bounds
}

type Dashboard = {
  currentCanvas: Canvas
  selectedIds: string[]
  activeDrag: ActiveDrag | null

  addCanvas: (title?: string, width?: number, height?: number, zoom?: number) => void
  addElement: (element: Element) => void
  updateElement: (id: string, updates: Partial<Element>) => void
  removeElement: (id: string) => void
  toggleElementLock: (id: string) => void
  clearCanvas: () => void

  setCamera: (partial: Partial<Camera>) => void
  setSelectedIds: (ids: string[]) => void
  setActiveDrag: (activeDrag: ActiveDrag | null) => void
}

export const useDashboardStore = create<Dashboard>()(
  devtools(
    immer((set) => ({
      currentCanvas: {
        id: crypto.randomUUID(),
        title: '新画布',
        width: 1920,
        height: 1080,
        camera: { x: 100, y: 100, zoom: 1.2 },
        elements: [],
      },
      selectedIds: [],
      activeDrag: null,

      addCanvas: (title = '新画布', width = 1920, height = 1080, zoom = 1) =>
        set((state) => {
          state.currentCanvas = {
            id: crypto.randomUUID(),
            title,
            width,
            height,
            camera: { x: 0, y: 0, zoom },
            elements: [],
          }
          state.selectedIds = []
          state.activeDrag = null
        }),

      addElement: (element: Element) =>
        set((state) => {
          if (!state.currentCanvas) return
          state.currentCanvas.elements.push(element)
        }),

      updateElement: (id, updates) =>
        set((state) => {
          if (!state.currentCanvas) return
          const element = state.currentCanvas.elements.find((e) => e.id === id)
          if (element) Object.assign(element, updates)
        }),

      removeElement: (id) =>
        set((state) => {
          if (!state.currentCanvas) return
          state.currentCanvas.elements = state.currentCanvas.elements.filter((e) => e.id !== id)
          state.selectedIds = state.selectedIds.filter((sid) => sid !== id)
          if (state.activeDrag?.ids.includes(id)) state.activeDrag = null
        }),

      toggleElementLock: (id) =>
        set((state) => {
          if (!state.currentCanvas) return
          const element = state.currentCanvas.elements.find((e) => e.id === id)
          if (element) element.locked = !element.locked
        }),

      clearCanvas: () =>
        set((state) => {
          if (state.currentCanvas) {
            state.currentCanvas.elements = []
            state.selectedIds = []
            state.activeDrag = null
          }
        }),

      setCamera: (partial) =>
        set((state) => {
          if (!state.currentCanvas) return
          state.currentCanvas.camera = { ...state.currentCanvas.camera, ...partial }
        }),

      setSelectedIds: (ids) =>
        set((state) => {
          state.selectedIds = ids
        }),

      setActiveDrag: (activeDrag) =>
        set((state) => {
          state.activeDrag = activeDrag
        }),
    }))
  )
)