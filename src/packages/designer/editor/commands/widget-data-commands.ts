import type { FieldType, SlotMapping, WidgetData } from '@schema/types'
import {
  addColumn,
  addRow,
  removeColumn,
  removeRow,
  renameColumn,
  setColumnType,
  updateCell,
} from '../../data/dataset-utils'
import type { Command } from '../command-registry'
import { findWidget } from './helpers'

// ─────────────────────────────────────────────────────────────────────
// Payloads
// ─────────────────────────────────────────────────────────────────────

/**
 * Wholesale replace `WidgetNode.data` (or clear it). Used by the
 * mode-picker when the user switches between inline / bound, and by
 * "提取为数据源" / "改回示例" affordances.
 *
 * `next: undefined` clears the field, which triggers the resolver to
 * fall back to the meta's sample dataset.
 */
export interface WidgetSetDataPayload {
  id: string
  next: WidgetData | undefined
}

export interface WidgetUpdateSlotMappingPayload {
  id: string
  /** Patch object merged into existing mapping; null value removes a slot. */
  mapping: Record<string, string | string[] | null>
}

export interface WidgetSetBoundSourcePayload {
  id: string
  sourceId: string
  /** Optional initial mapping (usually computed by the resolver auto-mapper). */
  mapping?: SlotMapping
}

export interface WidgetInlineCellPayload {
  id: string
  rowIndex: number
  columnName: string
  value: unknown
}

export interface WidgetInlineRowPayload {
  id: string
  /** Insert position; appended when omitted or out-of-range. */
  atIndex?: number
}

export interface WidgetInlineRowRemovePayload {
  id: string
  rowIndex: number
}

export interface WidgetInlineColumnAddPayload {
  id: string
  field?: { name?: string; type?: FieldType; label?: string }
}

export interface WidgetInlineColumnRemovePayload {
  id: string
  columnName: string
}

export interface WidgetInlineColumnRenamePayload {
  id: string
  oldName: string
  newName: string
}

export interface WidgetInlineColumnTypePayload {
  id: string
  columnName: string
  type: FieldType
}

// ─────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────

export const widgetSetDataCommand: Command<WidgetSetDataPayload> = {
  type: 'widget.setData',
  label: '修改数据',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const node = findWidget(draft, payload.id)
    if (!node) return
    if (payload.next === undefined) {
      delete node.data
    } else {
      node.data = payload.next
    }
  },
}

export const widgetUpdateSlotMappingCommand: Command<WidgetUpdateSlotMappingPayload> = {
  type: 'widget.updateSlotMapping',
  label: '修改字段映射',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const node = findWidget(draft, payload.id)
    // Slot mapping only makes sense in inline / bound modes. If the
    // widget is in sample mode (no `data`), the data tab should have
    // bootstrapped to inline first — defensive no-op here.
    if (!node?.data) return
    const next = { ...node.data.mapping }
    for (const [slot, col] of Object.entries(payload.mapping)) {
      if (col === null) delete next[slot]
      else next[slot] = col
    }
    node.data = { ...node.data, mapping: next }
  },
}

export const widgetSetBoundSourceCommand: Command<WidgetSetBoundSourcePayload> = {
  type: 'widget.setBoundSource',
  label: '绑定数据源',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const node = findWidget(draft, payload.id)
    if (!node) return
    node.data = {
      mode: 'bound',
      sourceId: payload.sourceId,
      mapping: payload.mapping ?? {},
    }
  },
}

export const widgetInlineCellCommand: Command<WidgetInlineCellPayload> = {
  type: 'widget.inlineCell',
  label: '编辑单元格',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const node = findWidget(draft, payload.id)
    if (!node?.data || node.data.mode !== 'inline') return
    node.data = {
      ...node.data,
      dataset: updateCell(
        node.data.dataset,
        payload.rowIndex,
        payload.columnName,
        payload.value,
      ),
    }
  },
  // Merge consecutive keystrokes on the same cell into one undo entry,
  // matching how `widget.updateLayout` merges arrow-key nudges.
  mergeKey: (p) => `inlineCell:${p.id}:${p.rowIndex}:${p.columnName}`,
}

export const widgetInlineRowAddCommand: Command<WidgetInlineRowPayload> = {
  type: 'widget.inlineRowAdd',
  label: '添加数据行',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const node = findWidget(draft, payload.id)
    if (!node?.data || node.data.mode !== 'inline') return
    node.data = {
      ...node.data,
      dataset: addRow(node.data.dataset, payload.atIndex),
    }
  },
}

export const widgetInlineRowRemoveCommand: Command<WidgetInlineRowRemovePayload> = {
  type: 'widget.inlineRowRemove',
  label: '删除数据行',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const node = findWidget(draft, payload.id)
    if (!node?.data || node.data.mode !== 'inline') return
    node.data = {
      ...node.data,
      dataset: removeRow(node.data.dataset, payload.rowIndex),
    }
  },
}

export const widgetInlineColumnAddCommand: Command<WidgetInlineColumnAddPayload> = {
  type: 'widget.inlineColumnAdd',
  label: '添加列',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const node = findWidget(draft, payload.id)
    if (!node?.data || node.data.mode !== 'inline') return
    const field = { type: 'string' as FieldType, ...payload.field }
    node.data = {
      ...node.data,
      dataset: addColumn(node.data.dataset, field),
    }
  },
}

export const widgetInlineColumnRemoveCommand: Command<WidgetInlineColumnRemovePayload> = {
  type: 'widget.inlineColumnRemove',
  label: '删除列',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const node = findWidget(draft, payload.id)
    if (!node?.data || node.data.mode !== 'inline') return
    const nextDs = removeColumn(node.data.dataset, payload.columnName)
    // Drop any slot mapping that pointed at this column — keeps the
    // mapping panel honest (and the resolver from looking up a now-
    // missing field).
    const mapping: SlotMapping = {}
    for (const [slot, col] of Object.entries(node.data.mapping)) {
      if (Array.isArray(col)) {
        const remaining = col.filter((c) => c !== payload.columnName)
        if (remaining.length > 0) mapping[slot] = remaining
      } else if (col !== payload.columnName) {
        mapping[slot] = col
      }
    }
    node.data = { ...node.data, dataset: nextDs, mapping }
  },
}

export const widgetInlineColumnRenameCommand: Command<WidgetInlineColumnRenamePayload> = {
  type: 'widget.inlineColumnRename',
  label: '重命名列',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const node = findWidget(draft, payload.id)
    if (!node?.data || node.data.mode !== 'inline') return
    // Guard the collision here instead of letting renameColumn throw:
    // `execute()` re-throws, which would surface as an uncaught error
    // inside the rename input's onBlur. The UI validates first, so this is
    // defense-in-depth — silently no-op on a conflict / missing column.
    if (payload.oldName === payload.newName) return
    const fields = node.data.dataset.fields
    if (!fields.some((f) => f.name === payload.oldName)) return
    if (fields.some((f) => f.name === payload.newName)) return
    const nextDs = renameColumn(node.data.dataset, payload.oldName, payload.newName)
    // Update slot mappings to point at the new column name.
    const mapping: SlotMapping = {}
    for (const [slot, col] of Object.entries(node.data.mapping)) {
      if (Array.isArray(col)) {
        mapping[slot] = col.map((c) => (c === payload.oldName ? payload.newName : c))
      } else {
        mapping[slot] = col === payload.oldName ? payload.newName : col
      }
    }
    node.data = { ...node.data, dataset: nextDs, mapping }
  },
}

export const widgetInlineColumnTypeCommand: Command<WidgetInlineColumnTypePayload> = {
  type: 'widget.inlineColumnType',
  label: '修改列类型',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const node = findWidget(draft, payload.id)
    if (!node?.data || node.data.mode !== 'inline') return
    node.data = {
      ...node.data,
      dataset: setColumnType(node.data.dataset, payload.columnName, payload.type),
    }
  },
}

export const widgetDataCommands: Command<any>[] = [
  widgetSetDataCommand,
  widgetUpdateSlotMappingCommand,
  widgetSetBoundSourceCommand,
  widgetInlineCellCommand,
  widgetInlineRowAddCommand,
  widgetInlineRowRemoveCommand,
  widgetInlineColumnAddCommand,
  widgetInlineColumnRemoveCommand,
  widgetInlineColumnRenameCommand,
  widgetInlineColumnTypeCommand,
]
