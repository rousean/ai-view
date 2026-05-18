import type { Layout, WidgetNode } from '@schema/types'
import { createGroupId, createWidgetId } from '@schema/index'
import type { Command } from '../command-registry'
import {
  findCurrentPageIndex,
  findWidget,
  findWidgetIndex,
  getCurrentPage,
  makeDefaultLayout,
} from './helpers'

// ─────────────────────────────────────────────────────────────────────
// Payload shapes
// ─────────────────────────────────────────────────────────────────────

export interface WidgetAddPayload {
  type: string
  id?: string
  name?: string
  position?: { x: number; y: number }
  size?: { width: number; height: number }
  /** Caller-provided initial props (must satisfy WidgetMeta validation). */
  props?: Record<string, unknown>
}

export interface WidgetAddManyPayload {
  nodes: Array<Omit<WidgetNode, 'id'> & { id?: string }>
}

export interface WidgetRemovePayload {
  ids: string[]
}

export interface WidgetUpdatePropsPayload {
  id: string
  props: Record<string, unknown>
}

export interface WidgetUpdateLayoutPayload {
  id: string
  layout: Partial<Layout>
}

export interface WidgetUpdateLayoutBatchPayload {
  updates: Array<{ id: string; layout: Partial<Layout> }>
}

export interface WidgetRenamePayload {
  id: string
  name: string
}

export interface WidgetSetFlagPayload {
  ids: string[]
  flag: 'locked' | 'hidden'
  value: boolean
}

export interface WidgetReorderPayload {
  /** Target ids in their new bottom-to-top order. */
  orderedIds: string[]
}

export interface WidgetMoveLayerPayload {
  ids: string[]
  /** +1 = bring forward; -1 = send backward. */
  delta: number
}

export interface WidgetGroupPayload {
  ids: string[]
  groupId?: string
}

export interface WidgetUngroupPayload {
  groupId: string
}

export interface WidgetFlipPayload {
  ids: string[]
  axis: 'x' | 'y'
}

// ─────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────

export const widgetAddCommand: Command<WidgetAddPayload> = {
  type: 'widget.add',
  label: '添加组件',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    const node: WidgetNode = {
      id: payload.id ?? createWidgetId(),
      type: payload.type,
      name: payload.name ?? payload.type,
      layout: makeDefaultLayout(payload),
      flags: { locked: false, hidden: false },
      props: payload.props ?? {},
      extensions: {},
    }
    page.widgets.push(node)
  },
}

export const widgetAddManyCommand: Command<WidgetAddManyPayload> = {
  type: 'widget.addMany',
  label: '添加组件',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    for (const incoming of payload.nodes) {
      page.widgets.push({
        ...incoming,
        id: incoming.id ?? createWidgetId(),
      } as WidgetNode)
    }
  },
}

export const widgetRemoveCommand: Command<WidgetRemovePayload> = {
  type: 'widget.remove',
  label: '删除组件',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    const set = new Set(payload.ids)
    page.widgets = page.widgets.filter((w) => !set.has(w.id))
  },
}

export const widgetUpdatePropsCommand: Command<WidgetUpdatePropsPayload> = {
  type: 'widget.updateProps',
  label: '修改属性',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const node = findWidget(draft, payload.id)
    if (!node) return
    node.props = { ...node.props, ...payload.props }
  },
}

export const widgetUpdateLayoutCommand: Command<WidgetUpdateLayoutPayload> = {
  type: 'widget.updateLayout',
  label: '调整布局',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const node = findWidget(draft, payload.id)
    if (!node) return
    node.layout = { ...node.layout, ...payload.layout }
  },
  mergeKey: (p) => `layout:${p.id}`,
}

export const widgetUpdateLayoutBatchCommand: Command<WidgetUpdateLayoutBatchPayload> = {
  type: 'widget.updateLayoutBatch',
  label: '调整布局',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    const map = new Map(payload.updates.map((u) => [u.id, u.layout]))
    for (const node of page.widgets) {
      const u = map.get(node.id)
      if (u) node.layout = { ...node.layout, ...u }
    }
  },
  mergeKey: (p) =>
    `layoutBatch:${p.updates
      .map((u) => u.id)
      .sort()
      .join(',')}`,
}

export const widgetRenameCommand: Command<WidgetRenamePayload> = {
  type: 'widget.rename',
  label: '重命名',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const node = findWidget(draft, payload.id)
    if (node) node.name = payload.name
  },
}

export const widgetSetFlagCommand: Command<WidgetSetFlagPayload> = {
  type: 'widget.setFlag',
  label: (p) => (p.flag === 'locked' ? '锁定' : '隐藏'),
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    const set = new Set(payload.ids)
    for (const node of page.widgets) {
      if (set.has(node.id)) node.flags[payload.flag] = payload.value
    }
  },
}

export const widgetFlipCommand: Command<WidgetFlipPayload> = {
  type: 'widget.flip',
  label: '镜像',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    const set = new Set(payload.ids)
    for (const node of page.widgets) {
      if (!set.has(node.id)) continue
      if (payload.axis === 'x') node.layout.flipX = !node.layout.flipX
      else node.layout.flipY = !node.layout.flipY
    }
  },
}

export const widgetReorderCommand: Command<WidgetReorderPayload> = {
  type: 'widget.reorder',
  label: '调整层级',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    const byId = new Map(page.widgets.map((w) => [w.id, w]))
    const reordered: WidgetNode[] = []
    for (const id of payload.orderedIds) {
      const w = byId.get(id)
      if (w) {
        reordered.push(w)
        byId.delete(id)
      }
    }
    // Append any leftovers (defensive).
    for (const w of byId.values()) reordered.push(w)
    page.widgets = reordered
  },
}

export const widgetMoveLayerCommand: Command<WidgetMoveLayerPayload> = {
  type: 'widget.moveLayer',
  label: (p) => (p.delta > 0 ? '上移一层' : '下移一层'),
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const pageIdx = findCurrentPageIndex(draft)
    if (pageIdx < 0) return
    const page = draft.pages[pageIdx]
    const set = new Set(payload.ids)
    const delta = payload.delta

    // For move-up: iterate from top down; for move-down: bottom up.
    const indices = page.widgets
      .map((w, i) => ({ w, i }))
      .filter(({ w }) => set.has(w.id))
      .map(({ i }) => i)
    if (delta > 0) indices.sort((a, b) => b - a)
    else indices.sort((a, b) => a - b)

    for (const i of indices) {
      const target = i + delta
      if (target < 0 || target >= page.widgets.length) continue
      if (set.has(page.widgets[target].id)) continue // would no-op
      const tmp = page.widgets[i]
      page.widgets[i] = page.widgets[target]
      page.widgets[target] = tmp
    }
  },
}

export const widgetGroupCommand: Command<WidgetGroupPayload> = {
  type: 'widget.group',
  label: '编组',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    const groupId = payload.groupId ?? createGroupId()
    const set = new Set(payload.ids)
    for (const node of page.widgets) {
      if (set.has(node.id)) node.groupId = groupId
    }
  },
}

export const widgetUngroupCommand: Command<WidgetUngroupPayload> = {
  type: 'widget.ungroup',
  label: '解组',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    for (const node of page.widgets) {
      if (node.groupId === payload.groupId) {
        delete node.groupId
      }
    }
  },
}

export const widgetCommands: Command<any>[] = [
  widgetAddCommand,
  widgetAddManyCommand,
  widgetRemoveCommand,
  widgetUpdatePropsCommand,
  widgetUpdateLayoutCommand,
  widgetUpdateLayoutBatchCommand,
  widgetRenameCommand,
  widgetSetFlagCommand,
  widgetFlipCommand,
  widgetReorderCommand,
  widgetMoveLayerCommand,
  widgetGroupCommand,
  widgetUngroupCommand,
]

// Suppress unused for helpers reserved for future commands.
void findWidgetIndex
