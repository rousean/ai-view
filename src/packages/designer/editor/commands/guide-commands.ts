import { createGuideId } from '@schema/index'
import type { Command } from '../command-registry'
import { getCurrentPage } from './helpers'

export interface GuideAddPayload {
  orientation: 'horizontal' | 'vertical'
  position: number
  id?: string
}

export interface GuideRemovePayload {
  id: string
}

export interface GuideUpdatePayload {
  id: string
  position: number
}

export interface GuideClearPayload {
  noop?: never
}

export const guideAddCommand: Command<GuideAddPayload> = {
  type: 'guide.add',
  label: '添加参考线',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    page.guides.push({
      id: payload.id ?? createGuideId(),
      orientation: payload.orientation,
      position: payload.position,
    })
  },
}

export const guideRemoveCommand: Command<GuideRemovePayload> = {
  type: 'guide.remove',
  label: '删除参考线',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    page.guides = page.guides.filter((g) => g.id !== payload.id)
  },
}

export const guideUpdateCommand: Command<GuideUpdatePayload> = {
  type: 'guide.update',
  label: '移动参考线',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    const g = page.guides.find((x) => x.id === payload.id)
    if (g) g.position = payload.position
  },
  // A continuous drag of a single guide should collapse to one undo
  // entry; HistoryManager's window does the rest.
  mergeKey: (p) => `guide:${p.id}`,
}

export const guideClearCommand: Command<GuideClearPayload> = {
  type: 'guide.clear',
  label: '清除所有参考线',
  undoable: true,
  apply: (draft) => {
    const page = getCurrentPage(draft)
    page.guides = []
  },
}

export const guideCommands: Command<any>[] = [
  guideAddCommand,
  guideRemoveCommand,
  guideUpdateCommand,
  guideClearCommand,
]
