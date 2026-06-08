import { z } from 'zod'
import { Table as TableIcon } from 'lucide-react'
import type { WidgetMeta } from '../../widget-meta'
import { TableComponent } from './component'
import { DEFAULT_TABLE_PROPS } from './default-props'
import { TablePreview } from './preview'
import { TABLE_PROPS_GROUPS } from './props-config'
import type { TableProps } from './types'

const FontStyleSchema = z.object({
  color: z.string().optional(),
  size: z.number().optional(),
  weight: z.union([z.literal('normal'), z.literal('bold'), z.number()]).optional(),
  italic: z.boolean().optional(),
})

const TablePropsSchema = z.object({
  showHeader: z.boolean(),
  headerFont: FontStyleSchema,
  headerBg: z.string(),
  cellFont: FontStyleSchema,
  striped: z.boolean(),
  stripeColor: z.string(),
  border: z.boolean(),
  borderColor: z.string(),
  rowHeight: z.number(),
})

export const tableMeta: WidgetMeta<TableProps> = {
  type: 'table',
  version: '1.0.0',
  category: 'basic',
  title: '表格',
  description: '按行列展示数据集',
  icon: TableIcon,
  tags: ['表格', 'table', '列表', '数据', 'grid'],

  defaultProps: DEFAULT_TABLE_PROPS,
  defaultLayout: { width: 420, height: 240 },
  defaultName: (i) => `表格 ${i + 1}`,

  propsSchema: TablePropsSchema,
  propsGroups: TABLE_PROPS_GROUPS,

  // No slots: the table renders the whole resolved dataset (fields + rows).
  dataSchema: {
    slots: [],
    sample: {
      fields: [
        { name: '地区', type: 'string' },
        { name: '销售额', type: 'number' },
        { name: '同比', type: 'string' },
      ],
      rows: [
        { 地区: '华东', 销售额: 128000, 同比: '+12%' },
        { 地区: '华北', 销售额: 96000, 同比: '+5%' },
        { 地区: '华南', 销售额: 153000, 同比: '+18%' },
        { 地区: '西部', 销售额: 74000, 同比: '-3%' },
      ],
    },
  },

  Component: TableComponent,
  Preview: TablePreview,

  capabilities: {
    resizable: true,
    rotatable: true,
    minSize: { width: 160, height: 80 },
  },
}

export default tableMeta
export type { TableProps }
