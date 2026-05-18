import type { Background, GridConfig } from '@schema/types'
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
}

export const canvasSetBackgroundCommand: Command<CanvasSetBackgroundPayload> = {
  type: 'canvas.setBackground',
  label: '设置背景',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    page.canvas.background = payload.background
  },
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
}

export const canvasCommands: Command<any>[] = [
  canvasSetSizeCommand,
  canvasSetBackgroundCommand,
  canvasToggleOrientationCommand,
  gridSetCommand,
]
