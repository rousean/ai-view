import type { Background, ColumnGridConfig, GridConfig, ScaleMode } from '@schema/types'
import type { Command } from '../command-registry'
import { getCurrentPage } from './helpers'

export interface CanvasSetSizePayload {
  width: number
  height: number
}

export interface CanvasSetBackgroundPayload {
  background: Background
}

export interface CanvasToggleOrientationPayload {
  /** Empty payload (just a flag holder). */
  noop?: never
}

export interface GridSetPayload {
  grid: Partial<GridConfig>
}

export interface ColumnGridSetPayload {
  columnGrid: Partial<ColumnGridConfig>
}

export interface CanvasSetSafeAreaPayload {
  safeArea: { enabled: boolean; margin: number } | undefined
}

export const canvasSetSizeCommand: Command<CanvasSetSizePayload> = {
  type: 'canvas.setSize',
  label: '调整画布尺寸',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    page.canvas.width = payload.width
    page.canvas.height = payload.height
    page.canvas.orientation = payload.width >= payload.height ? 'landscape' : 'portrait'
  },
  // Coalesce a scrub / rapid resize into a single undo entry.
  mergeKey: () => 'canvas.setSize',
}

export const canvasSetBackgroundCommand: Command<CanvasSetBackgroundPayload> = {
  type: 'canvas.setBackground',
  label: '设置背景',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    page.canvas.background = payload.background
  },
  // Coalesce angle scrubs / continuous colour picking into one entry.
  mergeKey: () => 'canvas.setBackground',
}

export const canvasToggleOrientationCommand: Command<CanvasToggleOrientationPayload> = {
  type: 'canvas.toggleOrientation',
  label: '横竖屏切换',
  undoable: true,
  apply: (draft) => {
    const page = getCurrentPage(draft)
    const { width, height } = page.canvas
    page.canvas.width = height
    page.canvas.height = width
    page.canvas.orientation = page.canvas.orientation === 'landscape' ? 'portrait' : 'landscape'
  },
}

export const gridSetCommand: Command<GridSetPayload> = {
  type: 'grid.set',
  label: '调整网格',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    page.grid = { ...page.grid, ...payload.grid }
  },
  // Coalesce a grid-size scrub into one undo entry.
  mergeKey: () => 'grid.set',
}

export const columnGridSetCommand: Command<ColumnGridSetPayload> = {
  type: 'columnGrid.set',
  label: '调整列栅格',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    const base: ColumnGridConfig = page.columnGrid ?? {
      enabled: false,
      columns: 12,
      gutter: 16,
      margin: 48,
    }
    page.columnGrid = { ...base, ...payload.columnGrid }
  },
  // Coalesce a columns / gutter scrub into one undo entry.
  mergeKey: () => 'columnGrid.set',
}

export const canvasSetSafeAreaCommand: Command<CanvasSetSafeAreaPayload> = {
  type: 'canvas.setSafeArea',
  label: '安全区',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    if (payload.safeArea === undefined) delete page.canvas.safeArea
    else page.canvas.safeArea = payload.safeArea
  },
  mergeKey: () => 'canvas.setSafeArea',
}

export interface CanvasSetScaleModePayload {
  scaleMode: ScaleMode
}

export const canvasSetScaleModeCommand: Command<CanvasSetScaleModePayload> = {
  type: 'canvas.setScaleMode',
  label: '适配方式',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    getCurrentPage(draft).canvas.scaleMode = payload.scaleMode
  },
}

export const canvasCommands: Command<any>[] = [
  canvasSetSizeCommand,
  canvasSetBackgroundCommand,
  canvasToggleOrientationCommand,
  canvasSetScaleModeCommand,
  gridSetCommand,
  columnGridSetCommand,
  canvasSetSafeAreaCommand,
]
