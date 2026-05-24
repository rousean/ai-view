import type { Layout, WidgetNode } from '@schema/types'
import { createGroupId, createWidgetId } from '@schema/index'
import { rotatedAABB, unionBBox } from '../../canvas/transformer/geometry'
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

export interface WidgetDuplicatePayload {
  /** Source widget ids on the current page. */
  ids: string[]
  /** Offset applied to the clones (default {10, 10}). */
  offset?: { x: number; y: number }
  /**
   * Optional pre-generated ids for the clones, parallel to `ids`. Provide
   * these from the caller when you need to select the clones after the
   * command runs — the apply function uses them verbatim, so they stay
   * stable across re-renders / undo / redo.
   */
  newIds?: string[]
}

export type WidgetAlignMode =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'h-center'
  | 'v-center'

export interface WidgetAlignPayload {
  ids: string[]
  mode: WidgetAlignMode
  /**
   * What to align relative to.
   *   `'selection'` — the union AABB of the selected widgets (default
   *                    when ids.length >= 2; useless for a single widget).
   *   `'page'`      — the current page's canvas rect (default for a
   *                    single widget; "centre this on the page").
   * Callers usually let the facade pick the right default.
   */
  anchor?: 'selection' | 'page'
}

export interface WidgetDistributePayload {
  ids: string[]
  axis: 'horizontal' | 'vertical'
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

export const widgetDuplicateCommand: Command<WidgetDuplicatePayload> = {
  type: 'widget.duplicate',
  label: '复制副本',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    const offset = payload.offset ?? { x: 10, y: 10 }
    const sourceIds = payload.ids
    const sourceSet = new Set(sourceIds)

    // Preserve group cohesion: if any of the selected widgets share a
    // groupId, the clones should share a *new* groupId (so duplicating
    // a 2-widget group gives you another 2-widget group, not 2 loose
    // widgets). Only remap groups whose source set is fully selected;
    // partially-selected groups → clones lose their groupId.
    const oldGroupCounts = new Map<string, number>()
    for (const w of page.widgets) {
      if (sourceSet.has(w.id) && w.groupId) {
        oldGroupCounts.set(w.groupId, (oldGroupCounts.get(w.groupId) ?? 0) + 1)
      }
    }
    const fullGroupSizes = new Map<string, number>()
    for (const w of page.widgets) {
      if (!w.groupId) continue
      fullGroupSizes.set(w.groupId, (fullGroupSizes.get(w.groupId) ?? 0) + 1)
    }
    const groupRemap = new Map<string, string>()
    for (const [gid, partialCount] of oldGroupCounts) {
      if (fullGroupSizes.get(gid) === partialCount) {
        groupRemap.set(gid, createGroupId())
      }
    }

    sourceIds.forEach((srcId, i) => {
      const src = page.widgets.find((w) => w.id === srcId)
      if (!src) return
      const newId = payload.newIds?.[i] ?? createWidgetId()
      const remappedGroup = src.groupId ? groupRemap.get(src.groupId) : undefined
      const clone: WidgetNode = {
        ...src,
        id: newId,
        name: `${src.name} 副本`,
        layout: { ...src.layout, x: src.layout.x + offset.x, y: src.layout.y + offset.y },
        flags: { ...src.flags },
        props: { ...src.props },
        extensions: { ...src.extensions },
        groupId: remappedGroup,
        // Keep optional fields if present (dataBinding / events / animation).
        dataBinding: src.dataBinding ? { ...src.dataBinding } : undefined,
        events: src.events ? src.events.map((e) => ({ ...e })) : undefined,
        animation: src.animation ? { ...src.animation } : undefined,
      }
      page.widgets.push(clone)
    })
  },
}

export const widgetAlignCommand: Command<WidgetAlignPayload> = {
  type: 'widget.align',
  label: '对齐',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    const set = new Set(payload.ids)
    const targets = page.widgets.filter((w) => set.has(w.id))
    if (targets.length === 0) return

    // Anchor: either the page rect or the union of the selection. Picking
    // the anchor here (rather than in the facade) means an undo replay
    // can rerun against the same anchor without re-deriving it.
    let anchorBox: { x: number; y: number; width: number; height: number }
    if (payload.anchor === 'page') {
      anchorBox = {
        x: 0,
        y: 0,
        width: page.canvas.width,
        height: page.canvas.height,
      }
    } else {
      const u = unionBBox(targets as WidgetNode[])
      if (!u) return
      anchorBox = u
    }

    const anchorRight = anchorBox.x + anchorBox.width
    const anchorBottom = anchorBox.y + anchorBox.height
    const anchorCenterX = anchorBox.x + anchorBox.width / 2
    const anchorCenterY = anchorBox.y + anchorBox.height / 2

    for (const w of targets) {
      // `rotatedAABB` gives the *visual* extent — needed for correct
      // alignment of rotated widgets, since `layout.x/y` is the un-rotated
      // top-left, not the visual one.
      const v = rotatedAABB(w as WidgetNode)
      let dx = 0
      let dy = 0
      switch (payload.mode) {
        case 'left':
          dx = anchorBox.x - v.x
          break
        case 'right':
          dx = anchorRight - (v.x + v.width)
          break
        case 'h-center':
          dx = anchorCenterX - (v.x + v.width / 2)
          break
        case 'top':
          dy = anchorBox.y - v.y
          break
        case 'bottom':
          dy = anchorBottom - (v.y + v.height)
          break
        case 'v-center':
          dy = anchorCenterY - (v.y + v.height / 2)
          break
      }
      if (dx === 0 && dy === 0) continue
      // Translating `layout.x/y` shifts the visual bbox by exactly the
      // same delta (rotation pivots around the widget centre, which
      // moves with the layout).
      w.layout.x += dx
      w.layout.y += dy
    }
  },
}

export const widgetDistributeCommand: Command<WidgetDistributePayload> = {
  type: 'widget.distribute',
  label: '等距分布',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const page = getCurrentPage(draft)
    const set = new Set(payload.ids)
    const targets = page.widgets.filter((w) => set.has(w.id))
    if (targets.length < 3) return // <3 has no degrees of freedom

    // Sort by visual leading edge along the axis. Endpoints stay where
    // they are; the interior widgets are re-spaced so the gap between
    // every neighbouring pair is identical (Figma's "tidy up" model).
    const horizontal = payload.axis === 'horizontal'
    const withBox = targets.map((w) => ({ w, box: rotatedAABB(w as WidgetNode) }))
    withBox.sort((a, b) => (horizontal ? a.box.x - b.box.x : a.box.y - b.box.y))

    const first = withBox[0]!
    const last = withBox[withBox.length - 1]!
    const span = horizontal
      ? last.box.x + last.box.width - first.box.x
      : last.box.y + last.box.height - first.box.y
    const sumSize = withBox.reduce((s, e) => s + (horizontal ? e.box.width : e.box.height), 0)
    const totalGap = span - sumSize
    if (totalGap < 0) return // overlapping — no sensible distribution
    const gap = totalGap / (withBox.length - 1)

    let cursor = horizontal ? first.box.x : first.box.y
    for (const { w, box } of withBox) {
      const target = cursor
      const current = horizontal ? box.x : box.y
      const delta = target - current
      if (delta !== 0) {
        if (horizontal) w.layout.x += delta
        else w.layout.y += delta
      }
      cursor += (horizontal ? box.width : box.height) + gap
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
  widgetDuplicateCommand,
  widgetAlignCommand,
  widgetDistributeCommand,
]

// Suppress unused for helpers reserved for future commands.
void findWidgetIndex
