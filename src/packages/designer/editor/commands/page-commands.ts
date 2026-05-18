import { createDefaultPage, createPageId } from '@schema/index'
import type { Command } from '../command-registry'

export interface PageAddPayload {
  name?: string
  /** Insert at this index. Default: append. */
  index?: number
}

export interface PageRemovePayload {
  pageId: string
}

export interface PageRenamePayload {
  pageId: string
  name: string
}

export interface PageSwitchPayload {
  pageId: string
}

export interface PageReorderPayload {
  orderedIds: string[]
}

export interface PageDuplicatePayload {
  pageId: string
}

export const pageAddCommand: Command<PageAddPayload> = {
  type: 'page.add',
  label: '新增页面',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = createDefaultPage(payload.name ?? `页面 ${draft.pages.length + 1}`)
    if (payload.index === undefined) draft.pages.push(page)
    else draft.pages.splice(payload.index, 0, page)
    if (draft.pages.length === 1) draft.currentPageId = page.id
  },
}

export const pageRemoveCommand: Command<PageRemovePayload> = {
  type: 'page.remove',
  label: '删除页面',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    if (draft.pages.length <= 1) return // never delete last page
    const idx = draft.pages.findIndex((p) => p.id === payload.pageId)
    if (idx < 0) return
    draft.pages.splice(idx, 1)
    if (draft.currentPageId === payload.pageId) {
      draft.currentPageId = draft.pages[Math.max(0, idx - 1)].id
    }
  },
}

export const pageRenameCommand: Command<PageRenamePayload> = {
  type: 'page.rename',
  label: '重命名页面',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = draft.pages.find((p) => p.id === payload.pageId)
    if (page) page.name = payload.name
  },
}

export const pageSwitchCommand: Command<PageSwitchPayload> = {
  type: 'page.switch',
  label: '切换页面',
  undoable: false,
  apply: (draft, _ctx, payload) => {
    if (draft.pages.some((p) => p.id === payload.pageId)) {
      draft.currentPageId = payload.pageId
    }
  },
}

export const pageReorderCommand: Command<PageReorderPayload> = {
  type: 'page.reorder',
  label: '调整页面顺序',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const byId = new Map(draft.pages.map((p) => [p.id, p]))
    const next = []
    for (const id of payload.orderedIds) {
      const p = byId.get(id)
      if (p) {
        next.push(p)
        byId.delete(id)
      }
    }
    for (const p of byId.values()) next.push(p)
    draft.pages = next
  },
}

export const pageDuplicateCommand: Command<PageDuplicatePayload> = {
  type: 'page.duplicate',
  label: '复制页面',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const idx = draft.pages.findIndex((p) => p.id === payload.pageId)
    if (idx < 0) return
    const original = draft.pages[idx]
    const copy = JSON.parse(JSON.stringify(original)) as typeof original
    copy.id = createPageId()
    copy.name = `${original.name} 副本`
    draft.pages.splice(idx + 1, 0, copy)
  },
}

export const pageCommands: Command<any>[] = [
  pageAddCommand,
  pageRemoveCommand,
  pageRenameCommand,
  pageSwitchCommand,
  pageReorderCommand,
  pageDuplicateCommand,
]
