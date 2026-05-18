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
  guideClearCommand,
]
